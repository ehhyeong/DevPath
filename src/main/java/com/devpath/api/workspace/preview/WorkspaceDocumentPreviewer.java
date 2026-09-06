package com.devpath.api.workspace.preview;

import com.devpath.api.workspace.dto.WorkspaceDocumentPreviewResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.workspace.entity.WorkspaceFile;
import java.io.IOException;
import javax.xml.parsers.ParserConfigurationException;
import javax.xml.stream.XMLStreamException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.xml.sax.SAXException;

@Component
@RequiredArgsConstructor
public class WorkspaceDocumentPreviewer {

  private final WorkspaceDocxPreviewer docxPreviewer;
  private final WorkspacePptxPreviewer pptxPreviewer;
  private final WorkspaceHwpxPreviewer hwpxPreviewer;

  public WorkspaceDocumentPreviewResponse getDocumentPreview(WorkspaceFile file) {
    if (file.isFolder()) {
      throw new CustomException(ErrorCode.FILE_NOT_FOUND);
    }

    String extension = fileExtension(file.getOriginalFileName());
    try {
      return switch (extension) {
        case "docx" -> docxPreviewer.preview(file);
        case "pptx" -> pptxPreviewer.preview(file);
        case "hwpx" -> hwpxPreviewer.preview(file);
        default -> throw new CustomException(ErrorCode.INVALID_INPUT);
      };
    } catch (IOException
        | XMLStreamException
        | ParserConfigurationException
        | SAXException
        | IllegalArgumentException e) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }
  }

  private String fileExtension(String fileName) {
    if (!StringUtils.hasText(fileName)) {
      return "";
    }

    int dotIndex = fileName.lastIndexOf('.');
    return dotIndex >= 0 ? fileName.substring(dotIndex + 1).toLowerCase() : "";
  }
}
