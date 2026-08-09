package com.devpath.api.workspace.preview;

import com.devpath.api.workspace.dto.WorkspacePresentationElementResponse;
import com.devpath.api.workspace.dto.WorkspacePresentationSlideResponse;
import com.devpath.api.workspace.storage.WorkspaceFileStorage;
import com.devpath.domain.workspace.entity.WorkspaceFile;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Comparator;
import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.stream.Stream;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
@RequiredArgsConstructor
public class WorkspaceOfficeRenderer {

  private static final int MAX_PRESENTATION_SLIDE_BYTES = 6 * 1024 * 1024;
  private static final int MAX_RENDERED_DOCUMENT_BYTES = 12 * 1024 * 1024;
  private static final int EXPORT_TIMEOUT_SECONDS = 45;
  private static final String POWERPOINT_EXPORT_SCRIPT =
      """
      param([string]$InputPath, [string]$OutputDir)
      $ErrorActionPreference = 'Stop'
      $powerPoint = $null
      $presentation = $null
      try {
        $powerPoint = New-Object -ComObject PowerPoint.Application
        $presentation = $powerPoint.Presentations.Open($InputPath, $true, $true, $false)
        $exportWidth = 1920
        $exportHeight = [int][Math]::Round($exportWidth * $presentation.PageSetup.SlideHeight / $presentation.PageSetup.SlideWidth)
        $presentation.Export($OutputDir, 'PNG', $exportWidth, $exportHeight)
      } finally {
        if ($presentation -ne $null) {
          $presentation.Close() | Out-Null
          [System.Runtime.InteropServices.Marshal]::ReleaseComObject($presentation) | Out-Null
        }
        if ($powerPoint -ne $null) {
          $powerPoint.Quit()
          [System.Runtime.InteropServices.Marshal]::ReleaseComObject($powerPoint) | Out-Null
        }
        [GC]::Collect()
        [GC]::WaitForPendingFinalizers()
      }
      """;
  private static final String WORD_EXPORT_SCRIPT =
      """
      param([string]$InputPath, [string]$OutputPath)
      $ErrorActionPreference = 'Stop'
      $word = $null
      $document = $null
      try {
        $word = New-Object -ComObject Word.Application
        $word.Visible = $false
        $document = $word.Documents.Open($InputPath, $false, $true)
        $document.ExportAsFixedFormat($OutputPath, 17)
      } finally {
        if ($document -ne $null) {
          $document.Close($false) | Out-Null
          [System.Runtime.InteropServices.Marshal]::ReleaseComObject($document) | Out-Null
        }
        if ($word -ne $null) {
          $word.Quit()
          [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
        }
        [GC]::Collect()
        [GC]::WaitForPendingFinalizers()
      }
      """;

  private final WorkspaceFileStorage workspaceFileStorage;

  @Value("${app.preview.word-rendering.enabled:false}")
  private boolean wordRenderingEnabled;

  List<WorkspacePresentationSlideResponse> renderPptx(
      WorkspaceFile file, long presentationWidth, long presentationHeight) {
    if (!isWindows()) {
      return List.of();
    }
    Path scriptPath = null;
    Path outputDirectory = null;
    try {
      Path inputPath = loadFilePath(file);
      if (inputPath == null) {
        return List.of();
      }
      scriptPath = Files.createTempFile("devpath-pptx-export-", ".ps1");
      outputDirectory = Files.createTempDirectory("devpath-pptx-preview-");
      Files.writeString(scriptPath, POWERPOINT_EXPORT_SCRIPT, StandardCharsets.UTF_8);
      if (!runPowerShell(scriptPath, inputPath, outputDirectory)) {
        return List.of();
      }
      return readRenderedPptxSlides(outputDirectory, presentationWidth, presentationHeight);
    } catch (IOException | InterruptedException e) {
      if (e instanceof InterruptedException) {
        Thread.currentThread().interrupt();
      }
      return List.of();
    } finally {
      deleteQuietly(scriptPath);
      deleteDirectoryContentsQuietly(outputDirectory);
      deleteQuietly(outputDirectory);
    }
  }

  RenderedDocument renderDocx(WorkspaceFile file) {
    if (!wordRenderingEnabled || !isWindows()) {
      return RenderedDocument.empty();
    }
    Path scriptPath = null;
    Path outputPath = null;
    try {
      Path inputPath = loadFilePath(file);
      if (inputPath == null) {
        return RenderedDocument.empty();
      }
      scriptPath = Files.createTempFile("devpath-docx-export-", ".ps1");
      outputPath = Files.createTempFile("devpath-docx-preview-", ".pdf");
      Files.writeString(scriptPath, WORD_EXPORT_SCRIPT, StandardCharsets.UTF_8);
      if (!runPowerShell(scriptPath, inputPath, outputPath)
          || Files.size(outputPath) > MAX_RENDERED_DOCUMENT_BYTES) {
        return RenderedDocument.empty();
      }
      return new RenderedDocument(
          "application/pdf", toDataUri("application/pdf", Files.readAllBytes(outputPath)));
    } catch (IOException | InterruptedException e) {
      if (e instanceof InterruptedException) {
        Thread.currentThread().interrupt();
      }
      return RenderedDocument.empty();
    } finally {
      deleteQuietly(scriptPath);
      deleteQuietly(outputPath);
    }
  }

  private Path loadFilePath(WorkspaceFile file) throws IOException {
    Resource resource = workspaceFileStorage.load(file);
    Path inputPath = resource.getFile().toPath();
    return Files.exists(inputPath) ? inputPath : null;
  }

  private boolean runPowerShell(Path script, Path input, Path output)
      throws IOException, InterruptedException {
    ProcessBuilder processBuilder =
        new ProcessBuilder(
            "powershell.exe",
            "-NoProfile",
            "-NonInteractive",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            script.toString(),
            input.toString(),
            output.toString());
    processBuilder.redirectErrorStream(true);
    processBuilder.redirectOutput(ProcessBuilder.Redirect.DISCARD);
    Process process = processBuilder.start();
    if (!process.waitFor(EXPORT_TIMEOUT_SECONDS, TimeUnit.SECONDS)) {
      process.destroyForcibly();
      return false;
    }
    return process.exitValue() == 0 && Files.exists(output);
  }

  private List<WorkspacePresentationSlideResponse> readRenderedPptxSlides(
      Path outputDirectory, long width, long height) throws IOException {
    List<WorkspacePresentationSlideResponse> slides = new ArrayList<>();
    try (Stream<Path> paths = Files.list(outputDirectory)) {
      List<Path> images =
          paths
              .filter(path -> "png".equals(fileExtension(path.getFileName().toString())))
              .sorted(Comparator.comparingInt(this::slideImageNumber))
              .toList();
      for (int index = 0; index < images.size(); index++) {
        Path image = images.get(index);
        byte[] imageBytes = Files.readAllBytes(image);
        if (imageBytes.length > MAX_PRESENTATION_SLIDE_BYTES) {
          continue;
        }
        int slideNumber = slideImageNumber(image);
        slides.add(
            WorkspacePresentationSlideResponse.builder()
                .slideNumber(slideNumber == Integer.MAX_VALUE ? index + 1 : slideNumber)
                .width(width)
                .height(height)
                .backgroundColor("#ffffff")
                .elements(
                    List.of(
                        WorkspacePresentationElementResponse.builder()
                            .type("image")
                            .x(0)
                            .y(0)
                            .width(width)
                            .height(height)
                            .imageDataUri(toDataUri("image/png", imageBytes))
                            .build()))
                .build());
      }
    }
    return slides;
  }

  private int slideImageNumber(Path imagePath) {
    String digits = imagePath.getFileName().toString().replaceAll("\\D+", "");
    if (!StringUtils.hasText(digits)) {
      return Integer.MAX_VALUE;
    }
    try {
      return Integer.parseInt(digits);
    } catch (NumberFormatException e) {
      return Integer.MAX_VALUE;
    }
  }

  private boolean isWindows() {
    return System.getProperty("os.name", "").toLowerCase().contains("win");
  }

  private String fileExtension(String fileName) {
    int dotIndex = fileName.lastIndexOf('.');
    return dotIndex >= 0 ? fileName.substring(dotIndex + 1).toLowerCase() : "";
  }

  private String toDataUri(String contentType, byte[] bytes) {
    return "data:" + contentType + ";base64," + Base64.getEncoder().encodeToString(bytes);
  }

  private void deleteDirectoryContentsQuietly(Path directory) {
    if (directory == null || !Files.isDirectory(directory)) {
      return;
    }
    try (Stream<Path> paths = Files.list(directory)) {
      paths.forEach(this::deleteQuietly);
    } catch (IOException ignored) {
      // The operating system can clean up temporary preview files if immediate deletion fails.
    }
  }

  private void deleteQuietly(Path path) {
    if (path == null) {
      return;
    }
    try {
      Files.deleteIfExists(path);
    } catch (IOException ignored) {
      // The operating system can clean up temporary preview files if immediate deletion fails.
    }
  }

  record RenderedDocument(String contentType, String dataUri) {
    static RenderedDocument empty() {
      return new RenderedDocument(null, null);
    }
  }
}
