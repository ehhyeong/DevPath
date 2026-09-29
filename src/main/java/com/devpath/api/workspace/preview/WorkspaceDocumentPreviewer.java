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
  private final WorkspacePdfPreviewer pdfPreviewer;
  private final WorkspacePlainTextPreviewer plainTextPreviewer;

  /** 본문 텍스트를 추출할 수 있는 확장자인지. AI 컨텍스트 수집에서 사전 판별용으로 쓴다. */
  public static boolean isTextExtractable(String fileName) {
    String extension = WorkspacePlainTextPreviewer.extensionOf(fileName);
    return switch (extension) {
      case "docx", "pptx", "hwpx", "pdf" -> true;
      default -> WorkspacePlainTextPreviewer.SUPPORTED_EXTENSIONS.contains(extension);
    };
  }

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
        case "pdf" -> pdfPreviewer.preview(file);
        default -> {
          if (!WorkspacePlainTextPreviewer.SUPPORTED_EXTENSIONS.contains(extension)) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
          }

          yield plainTextPreviewer.preview(file);
        }
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
