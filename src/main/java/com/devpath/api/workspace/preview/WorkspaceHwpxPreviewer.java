package com.devpath.api.workspace.preview;

import com.devpath.api.workspace.dto.WorkspaceDocumentPreviewResponse;
import com.devpath.api.workspace.storage.WorkspaceFileStorage;
import com.devpath.domain.workspace.entity.WorkspaceFile;
import java.io.BufferedInputStream;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import javax.xml.stream.XMLStreamException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class WorkspaceHwpxPreviewer {

  private static final int MAX_PREVIEW_CHARS = 60000;
  private static final int MAX_PREVIEW_IMAGE_BYTES = 12 * 1024 * 1024;
  private static final String HWPX_NAMESPACE = "hwpml";

  private final WorkspaceFileStorage workspaceFileStorage;

  WorkspaceDocumentPreviewResponse preview(WorkspaceFile file)
      throws IOException, XMLStreamException {
    WorkspaceXmlTextExtractor.TextCollector collector =
        new WorkspaceXmlTextExtractor.TextCollector(MAX_PREVIEW_CHARS);
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
          WorkspaceXmlTextExtractor.collect(
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
    String imageDataUri =
        previewImage != null && previewImage.length <= MAX_PREVIEW_IMAGE_BYTES
            ? "data:image/png;base64," + Base64.getEncoder().encodeToString(previewImage)
            : null;
    return WorkspaceDocumentPreviewResponse.builder()
        .documentType("hwpx")
        .text(collector.previewText())
        .truncated(collector.isTruncated())
        .renderedContentType(imageDataUri == null ? null : "image/png")
        .renderedDataUri(imageDataUri)
        .build();
  }
}
