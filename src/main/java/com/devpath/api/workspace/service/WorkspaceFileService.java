package com.devpath.api.workspace.service;

import com.devpath.api.workspace.dto.WorkspaceArchiveEntryResponse;
import com.devpath.api.workspace.dto.WorkspaceArchivePreviewResponse;
import com.devpath.api.workspace.dto.WorkspaceDocumentPreviewResponse;
import com.devpath.api.workspace.dto.WorkspaceFileResponse;
import com.devpath.api.workspace.dto.WorkspaceFileStorageSummaryResponse;
import com.devpath.api.workspace.dto.WorkspacePresentationElementResponse;
import com.devpath.api.workspace.dto.WorkspacePresentationSlideResponse;
import com.devpath.api.workspace.storage.StoredWorkspaceFile;
import com.devpath.api.workspace.storage.WorkspaceFileStorage;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.entity.UserProfile;
import com.devpath.domain.user.repository.UserProfileRepository;
import com.devpath.domain.user.repository.UserRepository;
import com.devpath.domain.workspace.entity.WorkspaceFile;
import com.devpath.domain.workspace.entity.WorkspaceFileType;
import com.devpath.domain.workspace.repository.WorkspaceFileRepository;
import com.devpath.domain.workspace.repository.WorkspaceMemberRepository;
import com.devpath.domain.workspace.repository.WorkspaceRepository;
import java.io.BufferedInputStream;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Collection;
import java.util.Comparator;
import java.util.Deque;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.concurrent.TimeUnit;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import javax.xml.stream.XMLInputFactory;
import javax.xml.stream.XMLStreamConstants;
import javax.xml.stream.XMLStreamException;
import javax.xml.stream.XMLStreamReader;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;
import lombok.RequiredArgsConstructor;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import org.xml.sax.SAXException;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WorkspaceFileService {

  private static final int MAX_ARCHIVE_PREVIEW_ENTRIES = 500;
  private static final int MAX_DOCUMENT_PREVIEW_CHARS = 60000;
  private static final int MAX_PRESENTATION_IMAGE_BYTES = 3 * 1024 * 1024;
  private static final int MAX_PRESENTATION_RENDERED_SLIDE_BYTES = 6 * 1024 * 1024;
  private static final int MAX_RENDERED_DOCUMENT_BYTES = 12 * 1024 * 1024;
  private static final int POWERPOINT_EXPORT_TIMEOUT_SECONDS = 45;
  private static final int WORD_EXPORT_TIMEOUT_SECONDS = 45;
  private static final String WORDPROCESSING_NAMESPACE = "wordprocessingml";
  private static final String DRAWING_NAMESPACE = "drawingml";
  private static final String HWPX_NAMESPACE = "hwpml";
  private static final String PPTX_RELATIONSHIP_NAMESPACE =
      "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
  private static final long DEFAULT_PRESENTATION_WIDTH = 12192000;
  private static final long DEFAULT_PRESENTATION_HEIGHT = 6858000;
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

  private final WorkspaceFileRepository workspaceFileRepository;
  private final WorkspaceRepository workspaceRepository;
  private final WorkspaceMemberRepository workspaceMemberRepository;
  private final UserRepository userRepository;
  private final UserProfileRepository userProfileRepository;
  private final WorkspaceFileStorage workspaceFileStorage;

  @Value("${app.storage.workspace.quota-bytes:5368709120}")
  private long workspaceStorageQuotaBytes;

  @Value("${app.preview.word-rendering.enabled:false}")
  private boolean wordRenderingEnabled;

  @Transactional
  public WorkspaceFileResponse uploadFile(Long workspaceId, Long userId, MultipartFile file) {
    return uploadFile(workspaceId, userId, null, file);
  }

  @Transactional
  public WorkspaceFileResponse uploadFile(
      Long workspaceId, Long userId, Long parentId, MultipartFile file) {
    validateWorkspaceExists(workspaceId);
    validateMember(workspaceId, userId);
    validateParentFolder(workspaceId, parentId);

    StoredWorkspaceFile storedFile = workspaceFileStorage.store(workspaceId, file);
    String originalFileName =
        StringUtils.hasText(file.getOriginalFilename()) ? file.getOriginalFilename() : "upload.bin";

    WorkspaceFile workspaceFile =
        WorkspaceFile.builder()
            .workspaceId(workspaceId)
            .parentId(parentId)
            .itemType(WorkspaceFileType.FILE)
            .originalFileName(originalFileName)
            .storedFileName(storedFile.storedFileName())
            .filePath(storedFile.filePath())
            .fileSize(storedFile.fileSize())
            .contentType(storedFile.contentType())
            .storageProvider(storedFile.storageProvider())
            .objectKey(storedFile.objectKey())
            .uploadedById(userId)
            .build();

    return toResponse(workspaceFileRepository.save(workspaceFile));
  }

  @Transactional
  public WorkspaceFileResponse createFolder(
      Long workspaceId, Long userId, String name, Long parentId) {
    validateWorkspaceExists(workspaceId);
    validateMember(workspaceId, userId);
    validateParentFolder(workspaceId, parentId);

    if (!StringUtils.hasText(name)) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }

    WorkspaceFile folder =
        WorkspaceFile.builder()
            .workspaceId(workspaceId)
            .parentId(parentId)
            .itemType(WorkspaceFileType.FOLDER)
            .originalFileName(name.trim())
            .storedFileName("")
            .filePath("")
            .fileSize(0)
            .contentType(null)
            .storageProvider(workspaceFileStorage.provider())
            .objectKey(null)
            .uploadedById(userId)
            .build();

    return toResponse(workspaceFileRepository.save(folder));
  }

  public List<WorkspaceFileResponse> getFiles(Long workspaceId, Long userId) {
    return getFiles(workspaceId, userId, null);
  }

  public List<WorkspaceFileResponse> getFiles(Long workspaceId, Long userId, Long parentId) {
    validateWorkspaceExists(workspaceId);
    validateMember(workspaceId, userId);
    validateParentFolder(workspaceId, parentId);

    List<WorkspaceFile> files =
        parentId == null
            ? workspaceFileRepository
                .findAllByWorkspaceIdAndParentIdIsNullAndIsDeletedFalseOrderByCreatedAtDesc(
                    workspaceId)
            : workspaceFileRepository
                .findAllByWorkspaceIdAndParentIdAndIsDeletedFalseOrderByCreatedAtDesc(
                    workspaceId, parentId);

    return toResponses(files);
  }

  public WorkspaceFileStorageSummaryResponse getStorageSummary(Long workspaceId, Long userId) {
    validateWorkspaceExists(workspaceId);
    validateMember(workspaceId, userId);

    long usedBytes =
        workspaceFileRepository.findAllByWorkspaceIdAndIsDeletedFalseOrderByCreatedAtDesc(
                workspaceId)
            .stream()
            .filter(file -> !file.isFolder())
            .mapToLong(WorkspaceFile::getFileSize)
            .sum();

    return WorkspaceFileStorageSummaryResponse.builder()
        .usedBytes(usedBytes)
        .quotaBytes(workspaceStorageQuotaBytes)
        .storageProvider(workspaceFileStorage.provider())
        .build();
  }

  public Resource downloadFile(Long fileId, Long userId) {
    WorkspaceFile workspaceFile = getFileEntity(fileId);
    validateMember(workspaceFile.getWorkspaceId(), userId);

    if (workspaceFile.isFolder()) {
      throw new CustomException(ErrorCode.FILE_NOT_FOUND);
    }

    return workspaceFileStorage.load(workspaceFile);
  }

  public String getOriginalFileName(Long fileId) {
    return getFileEntity(fileId).getOriginalFileName();
  }

  public String getContentType(Long fileId) {
    return getFileEntity(fileId).getContentType();
  }

  public WorkspaceArchivePreviewResponse getArchivePreview(Long fileId, Long userId) {
    WorkspaceFile workspaceFile = getFileEntity(fileId);
    validateMember(workspaceFile.getWorkspaceId(), userId);

    if (workspaceFile.isFolder() || !isZipFile(workspaceFile)) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }

    try {
      return readZipEntries(workspaceFile, StandardCharsets.UTF_8);
    } catch (IOException | IllegalArgumentException e) {
      try {
        return readZipEntries(workspaceFile, Charset.forName("MS949"));
      } catch (IOException | IllegalArgumentException ignored) {
        throw new CustomException(ErrorCode.INVALID_INPUT);
      }
    }
  }

  public WorkspaceDocumentPreviewResponse getDocumentPreview(Long fileId, Long userId) {
    WorkspaceFile workspaceFile = getFileEntity(fileId);
    validateMember(workspaceFile.getWorkspaceId(), userId);

    if (workspaceFile.isFolder()) {
      throw new CustomException(ErrorCode.FILE_NOT_FOUND);
    }

    String extension = fileExtension(workspaceFile.getOriginalFileName());

    try {
      if ("docx".equals(extension)) {
        return readDocxPreview(workspaceFile);
      }

      if ("pptx".equals(extension)) {
        return readPptxPreview(workspaceFile);
      }

      if ("hwpx".equals(extension)) {
        return readHwpxPreview(workspaceFile);
      }
    } catch (IOException
        | XMLStreamException
        | ParserConfigurationException
        | SAXException
        | IllegalArgumentException e) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }

    throw new CustomException(ErrorCode.INVALID_INPUT);
  }

  @Transactional
  public WorkspaceFileResponse renameFile(Long fileId, Long userId, String name) {
    WorkspaceFile workspaceFile = getFileEntity(fileId);
    validateMember(workspaceFile.getWorkspaceId(), userId);

    if (!StringUtils.hasText(name)) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }

    workspaceFile.rename(name.trim());
    return toResponse(workspaceFile);
  }

  @Transactional
  public void deleteFile(Long fileId, Long userId) {
    WorkspaceFile workspaceFile = getFileEntity(fileId);
    validateMember(workspaceFile.getWorkspaceId(), userId);
    deleteRecursively(workspaceFile);
  }

  private void deleteRecursively(WorkspaceFile workspaceFile) {
    workspaceFile.delete();

    if (!workspaceFile.isFolder()) {
      return;
    }

    workspaceFileRepository
        .findAllByParentIdAndIsDeletedFalse(workspaceFile.getId())
        .forEach(this::deleteRecursively);
  }

  private void validateWorkspaceExists(Long workspaceId) {
    workspaceRepository
        .findByIdAndIsDeletedFalse(workspaceId)
        .orElseThrow(() -> new CustomException(ErrorCode.WORKSPACE_NOT_FOUND));
  }

  private void validateMember(Long workspaceId, Long userId) {
    if (!workspaceMemberRepository.existsByWorkspaceIdAndLearnerId(workspaceId, userId)) {
      throw new CustomException(ErrorCode.WORKSPACE_FORBIDDEN);
    }
  }

  private void validateParentFolder(Long workspaceId, Long parentId) {
    if (parentId == null) {
      return;
    }

    WorkspaceFile parent =
        workspaceFileRepository
            .findByIdAndWorkspaceIdAndIsDeletedFalse(parentId, workspaceId)
            .orElseThrow(() -> new CustomException(ErrorCode.FILE_NOT_FOUND));

    if (!parent.isFolder()) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }
  }

  private WorkspaceFile getFileEntity(Long fileId) {
    return workspaceFileRepository
        .findByIdAndIsDeletedFalse(fileId)
        .orElseThrow(() -> new CustomException(ErrorCode.FILE_NOT_FOUND));
  }

  private boolean isZipFile(WorkspaceFile file) {
    String contentType = file.getContentType() == null ? "" : file.getContentType().toLowerCase();
    String fileName =
        file.getOriginalFileName() == null ? "" : file.getOriginalFileName().toLowerCase();

    return contentType.contains("zip") || fileName.endsWith(".zip");
  }

  private WorkspaceDocumentPreviewResponse readDocxPreview(WorkspaceFile file)
      throws IOException, XMLStreamException {
    TextPreviewCollector collector = new TextPreviewCollector(MAX_DOCUMENT_PREVIEW_CHARS);
    RenderedDocument renderedDocument = renderDocxWithWord(file);

    try (ZipInputStream zipInputStream =
        new ZipInputStream(
            new BufferedInputStream(workspaceFileStorage.load(file).getInputStream()),
            StandardCharsets.UTF_8)) {
      ZipEntry entry;

      while ((entry = zipInputStream.getNextEntry()) != null && !collector.isTruncated()) {
        String name = entry.getName();
        if ("word/document.xml".equals(name)
            || name.startsWith("word/header")
            || name.startsWith("word/footer")
            || name.startsWith("word/footnotes")) {
          collectOfficeXmlText(
              new ByteArrayInputStream(zipInputStream.readAllBytes()),
              collector,
              WORDPROCESSING_NAMESPACE,
              false);
        }
        zipInputStream.closeEntry();
      }
    }

    return WorkspaceDocumentPreviewResponse.builder()
        .documentType("docx")
        .text(collector.previewText())
        .truncated(collector.isTruncated())
        .renderedContentType(renderedDocument.contentType())
        .renderedDataUri(renderedDocument.dataUri())
        .build();
  }

  private WorkspaceDocumentPreviewResponse readPptxPreview(WorkspaceFile file)
      throws IOException, XMLStreamException, ParserConfigurationException, SAXException {
    TextPreviewCollector collector = new TextPreviewCollector(MAX_DOCUMENT_PREVIEW_CHARS);
    TreeMap<Integer, byte[]> slides = new TreeMap<>();
    Map<String, byte[]> packageEntries = new HashMap<>();

    try (ZipInputStream zipInputStream =
        new ZipInputStream(
            new BufferedInputStream(workspaceFileStorage.load(file).getInputStream()),
            StandardCharsets.UTF_8)) {
      ZipEntry entry;

      while ((entry = zipInputStream.getNextEntry()) != null) {
        String entryName = entry.getName();
        Integer slideNumber = pptxSlideNumber(entryName);
        if (slideNumber != null
            || "ppt/presentation.xml".equals(entryName)
            || entryName.startsWith("ppt/slides/_rels/")
            || entryName.startsWith("ppt/media/")) {
          packageEntries.put(entryName, zipInputStream.readAllBytes());
        }

        if (slideNumber != null) {
          slides.put(slideNumber, packageEntries.get(entryName));
        }
        zipInputStream.closeEntry();
      }
    }

    PresentationSize presentationSize =
        readPptxPresentationSize(packageEntries.get("ppt/presentation.xml"));
    List<WorkspacePresentationSlideResponse> renderedSlides =
        renderPptxSlidesWithPowerPoint(file, presentationSize);
    List<WorkspacePresentationSlideResponse> slidePreviews = new ArrayList<>();

    for (Map.Entry<Integer, byte[]> slide : slides.entrySet()) {
      if (collector.isTruncated()) {
        break;
      }

      collector.appendLine("Slide " + slide.getKey());
      collectOfficeXmlText(new ByteArrayInputStream(slide.getValue()), collector, DRAWING_NAMESPACE, true);
      collector.appendLineBreak();
      if (renderedSlides.isEmpty()) {
        slidePreviews.add(
            readPptxSlidePreview(
                slide.getKey(), slide.getValue(), presentationSize, packageEntries));
      }
    }

    return WorkspaceDocumentPreviewResponse.builder()
        .documentType("pptx")
        .text(collector.previewText())
        .truncated(collector.isTruncated())
        .slides(renderedSlides.isEmpty() ? slidePreviews : renderedSlides)
        .build();
  }

  private WorkspaceDocumentPreviewResponse readHwpxPreview(WorkspaceFile file)
      throws IOException, XMLStreamException {
    TextPreviewCollector collector = new TextPreviewCollector(MAX_DOCUMENT_PREVIEW_CHARS);
    byte[] previewText = null;
    byte[] previewImage = null;

    try (ZipInputStream zipInputStream =
        new ZipInputStream(
            new BufferedInputStream(workspaceFileStorage.load(file).getInputStream()),
            StandardCharsets.UTF_8)) {
      ZipEntry entry;

      while ((entry = zipInputStream.getNextEntry()) != null) {
        String name = entry.getName();
        if (!collector.isTruncated()
            && name.startsWith("Contents/section")
            && name.endsWith(".xml")) {
          collectOfficeXmlText(
              new ByteArrayInputStream(zipInputStream.readAllBytes()),
              collector,
              HWPX_NAMESPACE,
              false);
        } else if ("Preview/PrvText.txt".equals(name)) {
          previewText = zipInputStream.readAllBytes();
        } else if ("Preview/PrvImage.png".equals(name)) {
          previewImage = zipInputStream.readAllBytes();
        }
        zipInputStream.closeEntry();
      }
    }

    if (!collector.hasText() && previewText != null) {
      collector.append(new String(previewText, StandardCharsets.UTF_8));
    }

    String previewImageDataUri =
        previewImage != null && previewImage.length <= MAX_RENDERED_DOCUMENT_BYTES
            ? toDataUri("Preview/PrvImage.png", previewImage)
            : null;

    return WorkspaceDocumentPreviewResponse.builder()
        .documentType("hwpx")
        .text(collector.previewText())
        .truncated(collector.isTruncated())
        .renderedContentType(previewImageDataUri == null ? null : "image/png")
        .renderedDataUri(previewImageDataUri)
        .build();
  }

  private List<WorkspacePresentationSlideResponse> renderPptxSlidesWithPowerPoint(
      WorkspaceFile file, PresentationSize presentationSize) {
    if (!System.getProperty("os.name", "").toLowerCase().contains("win")) {
      return List.of();
    }

    Path scriptPath = null;
    Path outputDirectory = null;
    try {
      Resource resource = workspaceFileStorage.load(file);
      Path inputPath = resource.getFile().toPath();
      if (!Files.exists(inputPath)) {
        return List.of();
      }

      scriptPath = Files.createTempFile("devpath-pptx-export-", ".ps1");
      outputDirectory = Files.createTempDirectory("devpath-pptx-preview-");
      Files.writeString(scriptPath, POWERPOINT_EXPORT_SCRIPT, StandardCharsets.UTF_8);

      ProcessBuilder processBuilder =
          new ProcessBuilder(
              "powershell.exe",
              "-NoProfile",
              "-NonInteractive",
              "-ExecutionPolicy",
              "Bypass",
              "-File",
              scriptPath.toString(),
              inputPath.toString(),
              outputDirectory.toString());
      processBuilder.redirectErrorStream(true);
      processBuilder.redirectOutput(ProcessBuilder.Redirect.DISCARD);

      Process process = processBuilder.start();
      boolean completed = process.waitFor(POWERPOINT_EXPORT_TIMEOUT_SECONDS, TimeUnit.SECONDS);
      if (!completed) {
        process.destroyForcibly();
        return List.of();
      }

      if (process.exitValue() != 0) {
        return List.of();
      }

      return readRenderedPptxSlides(outputDirectory, presentationSize);
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

  private RenderedDocument renderDocxWithWord(WorkspaceFile file) {
    if (!wordRenderingEnabled) {
      return RenderedDocument.empty();
    }

    if (!System.getProperty("os.name", "").toLowerCase().contains("win")) {
      return RenderedDocument.empty();
    }

    Path scriptPath = null;
    Path outputPath = null;
    try {
      Resource resource = workspaceFileStorage.load(file);
      Path inputPath = resource.getFile().toPath();
      if (!Files.exists(inputPath)) {
        return RenderedDocument.empty();
      }

      scriptPath = Files.createTempFile("devpath-docx-export-", ".ps1");
      outputPath = Files.createTempFile("devpath-docx-preview-", ".pdf");
      Files.writeString(scriptPath, WORD_EXPORT_SCRIPT, StandardCharsets.UTF_8);

      ProcessBuilder processBuilder =
          new ProcessBuilder(
              "powershell.exe",
              "-NoProfile",
              "-NonInteractive",
              "-ExecutionPolicy",
              "Bypass",
              "-File",
              scriptPath.toString(),
              inputPath.toString(),
              outputPath.toString());
      processBuilder.redirectErrorStream(true);
      processBuilder.redirectOutput(ProcessBuilder.Redirect.DISCARD);

      Process process = processBuilder.start();
      boolean completed = process.waitFor(WORD_EXPORT_TIMEOUT_SECONDS, TimeUnit.SECONDS);
      if (!completed) {
        process.destroyForcibly();
        return RenderedDocument.empty();
      }

      if (process.exitValue() != 0
          || !Files.exists(outputPath)
          || Files.size(outputPath) > MAX_RENDERED_DOCUMENT_BYTES) {
        return RenderedDocument.empty();
      }

      byte[] pdf = Files.readAllBytes(outputPath);
      return new RenderedDocument("application/pdf", toDataUri("preview.pdf", pdf));
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

  private List<WorkspacePresentationSlideResponse> readRenderedPptxSlides(
      Path outputDirectory, PresentationSize presentationSize) throws IOException {
    List<WorkspacePresentationSlideResponse> slides = new ArrayList<>();

    try (Stream<Path> paths = Files.list(outputDirectory)) {
      List<Path> images =
          paths
              .filter(path -> "png".equals(fileExtension(path.getFileName().toString())))
              .sorted(Comparator.comparingInt(this::powerPointSlideImageNumber))
              .toList();

      for (int index = 0; index < images.size(); index++) {
        Path image = images.get(index);
        byte[] imageBytes = Files.readAllBytes(image);
        if (imageBytes.length > MAX_PRESENTATION_RENDERED_SLIDE_BYTES) {
          continue;
        }

        int slideNumber = powerPointSlideImageNumber(image);
        if (slideNumber == Integer.MAX_VALUE) {
          slideNumber = index + 1;
        }

        slides.add(
            WorkspacePresentationSlideResponse.builder()
                .slideNumber(slideNumber)
                .width(presentationSize.width())
                .height(presentationSize.height())
                .backgroundColor("#ffffff")
                .elements(
                    List.of(
                        WorkspacePresentationElementResponse.builder()
                            .type("image")
                            .x(0)
                            .y(0)
                            .width(presentationSize.width())
                            .height(presentationSize.height())
                            .imageDataUri(toDataUri(image.getFileName().toString(), imageBytes))
                            .build()))
                .build());
      }
    }

    return slides;
  }

  private int powerPointSlideImageNumber(Path imagePath) {
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

  private void deleteDirectoryContentsQuietly(Path directory) {
    if (directory == null || !Files.isDirectory(directory)) {
      return;
    }

    try (Stream<Path> paths = Files.list(directory)) {
      paths.forEach(this::deleteQuietly);
    } catch (IOException ignored) {
      // Temporary preview files can be cleaned by the operating system if deletion fails.
    }
  }

  private void deleteQuietly(Path path) {
    if (path == null) {
      return;
    }

    try {
      Files.deleteIfExists(path);
    } catch (IOException ignored) {
      // Temporary preview files can be cleaned by the operating system if deletion fails.
    }
  }

  private PresentationSize readPptxPresentationSize(byte[] presentationXml)
      throws ParserConfigurationException, IOException, SAXException {
    if (presentationXml == null) {
      return new PresentationSize(DEFAULT_PRESENTATION_WIDTH, DEFAULT_PRESENTATION_HEIGHT);
    }

    Document document = parseXml(presentationXml);
    Element slideSize = firstDescendant(document.getDocumentElement(), "sldSz");
    if (slideSize == null) {
      return new PresentationSize(DEFAULT_PRESENTATION_WIDTH, DEFAULT_PRESENTATION_HEIGHT);
    }

    return new PresentationSize(
        readLongAttribute(slideSize, "cx", DEFAULT_PRESENTATION_WIDTH),
        readLongAttribute(slideSize, "cy", DEFAULT_PRESENTATION_HEIGHT));
  }

  private WorkspacePresentationSlideResponse readPptxSlidePreview(
      int slideNumber,
      byte[] slideXml,
      PresentationSize presentationSize,
      Map<String, byte[]> packageEntries)
      throws ParserConfigurationException, IOException, SAXException {
    Document document = parseXml(slideXml);
    Element root = document.getDocumentElement();
    List<WorkspacePresentationElementResponse> elements = new ArrayList<>();
    Map<String, String> imageRelationships =
        readPptxImageRelationships(
            packageEntries.get("ppt/slides/_rels/slide" + slideNumber + ".xml.rels"));

    Element shapeTree = firstDescendant(root, "spTree");
    if (shapeTree != null) {
      collectPptxSlideElements(shapeTree, imageRelationships, packageEntries, elements);
    }

    return WorkspacePresentationSlideResponse.builder()
        .slideNumber(slideNumber)
        .width(presentationSize.width())
        .height(presentationSize.height())
        .backgroundColor(readPptxBackgroundColor(root))
        .elements(elements)
        .build();
  }

  private void collectPptxSlideElements(
      Element owner,
      Map<String, String> imageRelationships,
      Map<String, byte[]> packageEntries,
      List<WorkspacePresentationElementResponse> elements) {
    for (Element child : childElements(owner)) {
      WorkspacePresentationElementResponse element = null;
      String localName = localName(child);

      if ("sp".equals(localName)) {
        element = readPptxShape(child);
      } else if ("pic".equals(localName)) {
        element = readPptxPicture(child, imageRelationships, packageEntries);
      } else if ("grpSp".equals(localName)) {
        collectPptxSlideElements(child, imageRelationships, packageEntries, elements);
      }

      if (element != null) {
        elements.add(element);
      }
    }
  }

  private WorkspacePresentationElementResponse readPptxShape(Element shape) {
    PptxBounds bounds = readPptxBounds(shape);
    if (bounds == null) {
      return null;
    }

    String text = collectPptxText(shape);
    String fillColor = readPptxShapeFill(shape);
    if (!StringUtils.hasText(text) && !StringUtils.hasText(fillColor)) {
      return null;
    }

    return WorkspacePresentationElementResponse.builder()
        .type(StringUtils.hasText(text) ? "text" : "shape")
        .x(bounds.x())
        .y(bounds.y())
        .width(bounds.width())
        .height(bounds.height())
        .text(text)
        .fillColor(fillColor)
        .textColor(readPptxTextColor(shape))
        .fontSize(readPptxFontSize(shape))
        .bold(readPptxTextFlag(shape, "b"))
        .italic(readPptxTextFlag(shape, "i"))
        .build();
  }

  private WorkspacePresentationElementResponse readPptxPicture(
      Element picture, Map<String, String> imageRelationships, Map<String, byte[]> packageEntries) {
    PptxBounds bounds = readPptxBounds(picture);
    Element blip = firstDescendant(picture, "blip");
    if (bounds == null || blip == null) {
      return null;
    }

    String relationshipId = blip.getAttributeNS(PPTX_RELATIONSHIP_NAMESPACE, "embed");
    if (!StringUtils.hasText(relationshipId)) {
      relationshipId = blip.getAttribute("r:embed");
    }

    String imagePath = imageRelationships.get(relationshipId);
    byte[] image = imagePath == null ? null : packageEntries.get(imagePath);
    if (image == null || image.length > MAX_PRESENTATION_IMAGE_BYTES) {
      return null;
    }

    return WorkspacePresentationElementResponse.builder()
        .type("image")
        .x(bounds.x())
        .y(bounds.y())
        .width(bounds.width())
        .height(bounds.height())
        .imageDataUri(toDataUri(imagePath, image))
        .build();
  }

  private Map<String, String> readPptxImageRelationships(byte[] relationshipsXml)
      throws ParserConfigurationException, IOException, SAXException {
    Map<String, String> relationships = new HashMap<>();
    if (relationshipsXml == null) {
      return relationships;
    }

    Document document = parseXml(relationshipsXml);
    for (Element relationship : descendantElements(document.getDocumentElement(), "Relationship")) {
      String type = relationship.getAttribute("Type");
      String id = relationship.getAttribute("Id");
      String target = relationship.getAttribute("Target");
      if (type.contains("/image") && StringUtils.hasText(id) && StringUtils.hasText(target)) {
        relationships.put(id, resolvePptxTarget("ppt/slides/", target));
      }
    }

    return relationships;
  }

  private String readPptxBackgroundColor(Element slideRoot) {
    Element background = firstDescendant(slideRoot, "bg");
    String color = background == null ? null : readSolidColor(background);
    return StringUtils.hasText(color) ? color : "#ffffff";
  }

  private String readPptxShapeFill(Element shape) {
    Element shapeProperties = firstDescendant(shape, "spPr");
    return shapeProperties == null ? null : readSolidColor(shapeProperties);
  }

  private String readPptxTextColor(Element shape) {
    Element runProperties = firstDescendant(shape, "rPr");
    return runProperties == null ? null : readSolidColor(runProperties);
  }

  private Double readPptxFontSize(Element shape) {
    Element runProperties = firstDescendant(shape, "rPr");
    if (runProperties == null || !StringUtils.hasText(runProperties.getAttribute("sz"))) {
      return null;
    }

    try {
      return Double.parseDouble(runProperties.getAttribute("sz")) / 100;
    } catch (NumberFormatException e) {
      return null;
    }
  }

  private boolean readPptxTextFlag(Element shape, String attribute) {
    Element runProperties = firstDescendant(shape, "rPr");
    if (runProperties == null) {
      return false;
    }

    String value = runProperties.getAttribute(attribute);
    return "1".equals(value) || "true".equalsIgnoreCase(value);
  }

  private PptxBounds readPptxBounds(Element owner) {
    Element transform = firstDescendant(owner, "xfrm");
    if (transform == null) {
      return null;
    }

    Element offset = firstDescendant(transform, "off");
    Element extent = firstDescendant(transform, "ext");
    if (offset == null || extent == null) {
      return null;
    }

    long width = readLongAttribute(extent, "cx", 0);
    long height = readLongAttribute(extent, "cy", 0);
    if (width <= 0 || height <= 0) {
      return null;
    }

    return new PptxBounds(
        readLongAttribute(offset, "x", 0),
        readLongAttribute(offset, "y", 0),
        width,
        height);
  }

  private String collectPptxText(Element shape) {
    Element textBody = firstDescendant(shape, "txBody");
    if (textBody == null) {
      return "";
    }

    List<String> paragraphs = new ArrayList<>();
    for (Element paragraph : childElements(textBody, "p")) {
      StringBuilder paragraphText = new StringBuilder();
      for (Element textRun : descendantElements(paragraph, "t")) {
        paragraphText.append(textRun.getTextContent());
      }
      if (StringUtils.hasText(paragraphText)) {
        paragraphs.add(paragraphText.toString());
      }
    }

    return String.join("\n", paragraphs).trim();
  }

  private String readSolidColor(Element owner) {
    for (Element solidFill : descendantElements(owner, "solidFill")) {
      Element srgbColor = firstDescendant(solidFill, "srgbClr");
      if (srgbColor != null && StringUtils.hasText(srgbColor.getAttribute("val"))) {
        return "#" + srgbColor.getAttribute("val");
      }
    }

    return null;
  }

  private String toDataUri(String imagePath, byte[] image) {
    return "data:"
        + imageContentType(imagePath)
        + ";base64,"
        + Base64.getEncoder().encodeToString(image);
  }

  private String imageContentType(String imagePath) {
    String extension = fileExtension(imagePath);
    return switch (extension) {
      case "pdf" -> "application/pdf";
      case "jpg", "jpeg" -> "image/jpeg";
      case "gif" -> "image/gif";
      case "svg" -> "image/svg+xml";
      case "webp" -> "image/webp";
      default -> "image/png";
    };
  }

  private String resolvePptxTarget(String baseDirectory, String target) {
    if (target.startsWith("/")) {
      return target.substring(1);
    }

    Deque<String> segments = new ArrayDeque<>();
    for (String segment : (baseDirectory + target).split("/")) {
      if (segment.isBlank() || ".".equals(segment)) {
        continue;
      }

      if ("..".equals(segment)) {
        if (!segments.isEmpty()) {
          segments.removeLast();
        }
      } else {
        segments.addLast(segment);
      }
    }

    return String.join("/", segments);
  }

  private Document parseXml(byte[] xml)
      throws ParserConfigurationException, IOException, SAXException {
    DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
    factory.setNamespaceAware(true);
    factory.setExpandEntityReferences(false);
    setDocumentFeature(factory, "http://apache.org/xml/features/disallow-doctype-decl", true);
    setDocumentFeature(factory, "http://xml.org/sax/features/external-general-entities", false);
    setDocumentFeature(factory, "http://xml.org/sax/features/external-parameter-entities", false);
    return factory.newDocumentBuilder().parse(new ByteArrayInputStream(xml));
  }

  private void setDocumentFeature(DocumentBuilderFactory factory, String feature, boolean enabled) {
    try {
      factory.setFeature(feature, enabled);
    } catch (ParserConfigurationException ignored) {
      // Some XML parsers do not expose every hardening flag.
    }
  }

  private Element firstDescendant(Node node, String localName) {
    if (node == null) {
      return null;
    }

    if (node.getNodeType() == Node.ELEMENT_NODE && localName.equals(localName(node))) {
      return (Element) node;
    }

    Node child = node.getFirstChild();
    while (child != null) {
      Element match = firstDescendant(child, localName);
      if (match != null) {
        return match;
      }
      child = child.getNextSibling();
    }

    return null;
  }

  private List<Element> descendantElements(Node node, String localName) {
    List<Element> elements = new ArrayList<>();
    collectDescendantElements(node, localName, elements);
    return elements;
  }

  private void collectDescendantElements(Node node, String localName, List<Element> elements) {
    if (node == null) {
      return;
    }

    if (node.getNodeType() == Node.ELEMENT_NODE && localName.equals(localName(node))) {
      elements.add((Element) node);
    }

    Node child = node.getFirstChild();
    while (child != null) {
      collectDescendantElements(child, localName, elements);
      child = child.getNextSibling();
    }
  }

  private List<Element> childElements(Node node) {
    List<Element> elements = new ArrayList<>();
    if (node == null) {
      return elements;
    }

    Node child = node.getFirstChild();
    while (child != null) {
      if (child.getNodeType() == Node.ELEMENT_NODE) {
        elements.add((Element) child);
      }
      child = child.getNextSibling();
    }

    return elements;
  }

  private List<Element> childElements(Node node, String localName) {
    return childElements(node).stream()
        .filter(element -> localName.equals(localName(element)))
        .toList();
  }

  private String localName(Node node) {
    String localName = node.getLocalName();
    if (localName != null) {
      return localName;
    }

    String nodeName = node.getNodeName();
    int prefixIndex = nodeName.indexOf(':');
    return prefixIndex >= 0 ? nodeName.substring(prefixIndex + 1) : nodeName;
  }

  private long readLongAttribute(Element element, String attribute, long fallback) {
    if (element == null || !StringUtils.hasText(element.getAttribute(attribute))) {
      return fallback;
    }

    try {
      return Long.parseLong(element.getAttribute(attribute));
    } catch (NumberFormatException e) {
      return fallback;
    }
  }

  private void collectOfficeXmlText(
      java.io.InputStream inputStream,
      TextPreviewCollector collector,
      String namespaceMarker,
      boolean separateRuns)
      throws XMLStreamException {
    XMLStreamReader reader = xmlInputFactory().createXMLStreamReader(inputStream);
    boolean inTextElement = false;

    try {
      while (reader.hasNext() && !collector.isTruncated()) {
        int event = reader.next();

        if (event == XMLStreamConstants.START_ELEMENT) {
          inTextElement =
              "t".equals(reader.getLocalName())
                  && isOfficeNamespace(reader.getNamespaceURI(), namespaceMarker);
        } else if (event == XMLStreamConstants.CHARACTERS && inTextElement) {
          collector.append(reader.getText());
          if (separateRuns) {
            collector.append(" ");
          }
        } else if (event == XMLStreamConstants.END_ELEMENT
            && isOfficeNamespace(reader.getNamespaceURI(), namespaceMarker)) {
          if ("t".equals(reader.getLocalName())) {
            inTextElement = false;
          } else if ("p".equals(reader.getLocalName())
              || "br".equals(reader.getLocalName())
              || "lineBreak".equals(reader.getLocalName())) {
            collector.appendLineBreak();
          }
        }
      }
    } finally {
      reader.close();
    }
  }

  private boolean isOfficeNamespace(String namespaceUri, String namespaceMarker) {
    return namespaceUri != null && namespaceUri.contains(namespaceMarker);
  }

  private XMLInputFactory xmlInputFactory() {
    XMLInputFactory factory = XMLInputFactory.newFactory();
    disableXmlInputFeature(factory, XMLInputFactory.SUPPORT_DTD);
    disableXmlInputFeature(factory, "javax.xml.stream.isSupportingExternalEntities");
    return factory;
  }

  private void disableXmlInputFeature(XMLInputFactory factory, String feature) {
    try {
      factory.setProperty(feature, false);
    } catch (IllegalArgumentException ignored) {
      // Some StAX implementations do not expose every hardening flag.
    }
  }

  private WorkspaceArchivePreviewResponse readZipEntries(WorkspaceFile file, Charset charset)
      throws IOException {
    List<WorkspaceArchiveEntryResponse> entries = new ArrayList<>();
    boolean truncated = false;

    try (ZipInputStream zipInputStream =
        new ZipInputStream(
            new BufferedInputStream(workspaceFileStorage.load(file).getInputStream()), charset)) {
      ZipEntry entry;

      while ((entry = zipInputStream.getNextEntry()) != null) {
        if (entries.size() >= MAX_ARCHIVE_PREVIEW_ENTRIES) {
          truncated = true;
          break;
        }

        entries.add(
            WorkspaceArchiveEntryResponse.builder()
                .name(normalizeArchiveEntryName(entry.getName()))
                .directory(entry.isDirectory())
                .size(toNullableSize(entry.getSize()))
                .compressedSize(toNullableSize(entry.getCompressedSize()))
                .build());
        zipInputStream.closeEntry();
      }
    }

    return WorkspaceArchivePreviewResponse.builder().entries(entries).truncated(truncated).build();
  }

  private Long toNullableSize(long size) {
    return size < 0 ? null : size;
  }

  private String normalizeArchiveEntryName(String name) {
    String normalized = name == null ? "" : name.replace('\\', '/').replaceAll("[\\r\\n]", "_");
    return StringUtils.hasText(normalized) ? normalized : "(unnamed)";
  }

  private String fileExtension(String fileName) {
    if (!StringUtils.hasText(fileName)) {
      return "";
    }

    int dotIndex = fileName.lastIndexOf('.');
    return dotIndex >= 0 ? fileName.substring(dotIndex + 1).toLowerCase() : "";
  }

  private Integer pptxSlideNumber(String entryName) {
    if (entryName == null || !entryName.startsWith("ppt/slides/slide") || !entryName.endsWith(".xml")) {
      return null;
    }

    String number = entryName.substring("ppt/slides/slide".length(), entryName.length() - 4);
    try {
      return Integer.parseInt(number);
    } catch (NumberFormatException e) {
      return null;
    }
  }

  private WorkspaceFileResponse toResponse(WorkspaceFile file) {
    User uploader = userRepository.findById(file.getUploadedById()).orElse(null);
    UserProfile profile = userProfileRepository.findByUserId(file.getUploadedById()).orElse(null);
    return WorkspaceFileResponse.from(file, uploader, profile);
  }

  private List<WorkspaceFileResponse> toResponses(List<WorkspaceFile> files) {
    List<WorkspaceFile> sortedFiles = files.stream().sorted(fileComparator()).toList();
    if (sortedFiles.isEmpty()) {
      return List.of();
    }

    Collection<Long> uploaderIds =
        sortedFiles.stream().map(WorkspaceFile::getUploadedById).distinct().toList();
    Map<Long, User> usersById =
        userRepository.findAllById(uploaderIds).stream()
            .collect(Collectors.toMap(User::getId, Function.identity()));
    Map<Long, UserProfile> profilesByUserId =
        userProfileRepository.findAllByUserIdIn(uploaderIds).stream()
            .collect(Collectors.toMap(profile -> profile.getUser().getId(), Function.identity()));

    return sortedFiles.stream()
        .map(
            file ->
                WorkspaceFileResponse.from(
                    file, usersById.get(file.getUploadedById()), profilesByUserId.get(
                        file.getUploadedById())))
        .toList();
  }

  private Comparator<WorkspaceFile> fileComparator() {
    return Comparator.comparing((WorkspaceFile file) -> file.isFolder() ? 0 : 1)
        .thenComparing(
            WorkspaceFile::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder()));
  }

  private record PresentationSize(long width, long height) {}

  private record PptxBounds(long x, long y, long width, long height) {}

  private record RenderedDocument(String contentType, String dataUri) {
    private static RenderedDocument empty() {
      return new RenderedDocument(null, null);
    }
  }

  private static final class TextPreviewCollector {
    private final StringBuilder text = new StringBuilder();
    private final int maxChars;
    private boolean truncated;

    private TextPreviewCollector(int maxChars) {
      this.maxChars = maxChars;
    }

    private void append(String value) {
      if (value == null || value.isEmpty() || truncated) {
        return;
      }

      int remaining = maxChars - text.length();
      if (remaining <= 0) {
        truncated = true;
        return;
      }

      if (value.length() > remaining) {
        text.append(value, 0, remaining);
        truncated = true;
        return;
      }

      text.append(value);
    }

    private void appendLine(String value) {
      append(value);
      appendLineBreak();
    }

    private void appendLineBreak() {
      if (truncated || text.isEmpty() || text.charAt(text.length() - 1) == '\n') {
        return;
      }

      append("\n");
    }

    private boolean isTruncated() {
      return truncated;
    }

    private boolean hasText() {
      return StringUtils.hasText(text);
    }

    private String previewText() {
      String normalized = text.toString().replaceAll("\\n{3,}", "\n\n").trim();
      return StringUtils.hasText(normalized) ? normalized : "미리보기할 텍스트가 없습니다.";
    }
  }
}
