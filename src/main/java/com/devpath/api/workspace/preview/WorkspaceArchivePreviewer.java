package com.devpath.api.workspace.preview;

import com.devpath.api.workspace.dto.WorkspaceArchiveEntryResponse;
import com.devpath.api.workspace.dto.WorkspaceArchivePreviewResponse;
import com.devpath.api.workspace.storage.WorkspaceFileStorage;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.workspace.entity.WorkspaceFile;
import java.io.BufferedInputStream;
import java.io.IOException;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
@RequiredArgsConstructor
public class WorkspaceArchivePreviewer {

  private static final int MAX_PREVIEW_ENTRIES = 500;

  private final WorkspaceFileStorage workspaceFileStorage;

  public WorkspaceArchivePreviewResponse getPreview(WorkspaceFile file) {
    if (file.isFolder() || !isZipFile(file)) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }

    try {
      return readZipEntries(file, StandardCharsets.UTF_8);
    } catch (IOException | IllegalArgumentException e) {
      try {
        return readZipEntries(file, Charset.forName("MS949"));
      } catch (IOException | IllegalArgumentException ignored) {
        throw new CustomException(ErrorCode.INVALID_INPUT);
      }
    }
  }

  private boolean isZipFile(WorkspaceFile file) {
    String contentType = file.getContentType() == null ? "" : file.getContentType().toLowerCase();
    String fileName =
        file.getOriginalFileName() == null ? "" : file.getOriginalFileName().toLowerCase();
    return contentType.contains("zip") || fileName.endsWith(".zip");
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
        if (entries.size() >= MAX_PREVIEW_ENTRIES) {
          truncated = true;
          break;
        }
        entries.add(
            WorkspaceArchiveEntryResponse.builder()
                .name(normalizeEntryName(entry.getName()))
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

  private String normalizeEntryName(String name) {
    String normalized = name == null ? "" : name.replace('\\', '/').replaceAll("[\\r\\n]", "_");
    return StringUtils.hasText(normalized) ? normalized : "(unnamed)";
  }
}
