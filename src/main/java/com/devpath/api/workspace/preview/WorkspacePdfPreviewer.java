package com.devpath.api.workspace.preview;

import com.devpath.api.workspace.dto.WorkspaceDocumentPreviewResponse;
import com.devpath.api.workspace.storage.WorkspaceFileStorage;
import com.devpath.domain.workspace.entity.WorkspaceFile;
import java.io.IOException;
import java.io.InputStream;
import lombok.RequiredArgsConstructor;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Component;

/** PDF 본문 텍스트를 추출한다. 스캔 이미지 PDF는 텍스트가 없어 빈 결과가 나올 수 있다. */
@Component
@RequiredArgsConstructor
public class WorkspacePdfPreviewer {

  private static final int MAX_PREVIEW_CHARS = 60000;
  private static final int MAX_PAGES = 50;

  private final WorkspaceFileStorage workspaceFileStorage;

  WorkspaceDocumentPreviewResponse preview(WorkspaceFile file) throws IOException {
    String text;

    try (InputStream inputStream = workspaceFileStorage.load(file).getInputStream();
        PDDocument document = PDDocument.load(inputStream)) {
      PDFTextStripper stripper = new PDFTextStripper();
      stripper.setStartPage(1);
      stripper.setEndPage(Math.min(document.getNumberOfPages(), MAX_PAGES));
      text = stripper.getText(document).trim();
    }

    boolean truncated = text.length() > MAX_PREVIEW_CHARS;

    return WorkspaceDocumentPreviewResponse.builder()
        .documentType("pdf")
        .text(truncated ? text.substring(0, MAX_PREVIEW_CHARS) : text)
        .truncated(truncated)
        .build();
  }
}