package com.devpath.api.workspace.preview;

import com.devpath.api.workspace.dto.WorkspaceDocumentPreviewResponse;
import com.devpath.api.workspace.storage.WorkspaceFileStorage;
import com.devpath.domain.workspace.entity.WorkspaceFile;
import java.io.BufferedInputStream;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import javax.xml.stream.XMLStreamException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class WorkspaceDocxPreviewer {

  private static final int MAX_PREVIEW_CHARS = 60000;
  private static final String WORDPROCESSING_NAMESPACE = "wordprocessingml";

  private final WorkspaceFileStorage workspaceFileStorage;
  private final WorkspaceOfficeRenderer officeRenderer;

  WorkspaceDocumentPreviewResponse preview(WorkspaceFile file)
      throws IOException, XMLStreamException {
    WorkspaceXmlTextExtractor.TextCollector collector =
        new WorkspaceXmlTextExtractor.TextCollector(MAX_PREVIEW_CHARS);
    WorkspaceOfficeRenderer.RenderedDocument renderedDocument = officeRenderer.renderDocx(file);
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
          WorkspaceXmlTextExtractor.collect(
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
}
