package com.devpath.api.workspace.preview;

import com.devpath.api.workspace.dto.WorkspaceDocumentPreviewResponse;
import com.devpath.api.workspace.storage.WorkspaceFileStorage;
import com.devpath.domain.workspace.entity.WorkspaceFile;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** 텍스트 기반 파일(문서·설정·소스코드)에서 본문을 읽는다. */
@Component
@RequiredArgsConstructor
public class WorkspacePlainTextPreviewer {

  static final Set<String> SUPPORTED_EXTENSIONS =
      Set.of(
          "txt", "md", "markdown", "csv", "tsv", "json", "log", "html", "htm", "xml", "yml", "yaml",
          "java", "js", "jsx", "ts", "tsx", "py", "sql", "sh", "css", "scss", "kt", "go", "rb",
          "properties", "gradle");

  private static final int MAX_PREVIEW_CHARS = 60000;
  private static final int MAX_READ_BYTES = 4 * 1024 * 1024;
  // 한글 Windows에서 만든 파일이 CP949로 저장된 경우가 있어 폴백으로 둔다.
  private static final Charset FALLBACK_CHARSET = Charset.forName("MS949");

  private final WorkspaceFileStorage workspaceFileStorage;

  WorkspaceDocumentPreviewResponse preview(WorkspaceFile file) throws IOException {
    byte[] bytes;

    try (InputStream inputStream = workspaceFileStorage.load(file).getInputStream()) {
      bytes = inputStream.readNBytes(MAX_READ_BYTES);
    }

    String extension = extensionOf(file.getOriginalFileName());
    String decoded = decode(bytes);
    String text = isHtml(extension) ? stripHtml(decoded) : decoded;
    boolean truncated = text.length() > MAX_PREVIEW_CHARS;

    return WorkspaceDocumentPreviewResponse.builder()
        .documentType(extension)
        .text(truncated ? text.substring(0, MAX_PREVIEW_CHARS) : text)
        .truncated(truncated)
        .build();
  }

  /** UTF-8로 먼저 읽고, 치환 문자가 나오면 MS949로 다시 읽는다. */
  private String decode(byte[] bytes) {
    String utf8 = new String(bytes, StandardCharsets.UTF_8);
    return utf8.indexOf('�') >= 0 ? new String(bytes, FALLBACK_CHARSET) : utf8;
  }

  private boolean isHtml(String extension) {
    return "html".equals(extension) || "htm".equals(extension);
  }

  private String stripHtml(String value) {
    return value
        .replaceAll("(?is)<(script|style)[^>]*>.*?</\\1>", " ")
        .replaceAll("(?s)<[^>]+>", " ")
        .replaceAll("&nbsp;", " ")
        .replaceAll("[ \\t]+", " ")
        .replaceAll("(?m)^ +| +$", "")
        .replaceAll("\n{3,}", "\n\n")
        .trim();
  }

  static String extensionOf(String fileName) {
    if (fileName == null || fileName.isBlank()) {
      return "";
    }

    int dotIndex = fileName.lastIndexOf('.');
    return dotIndex >= 0 ? fileName.substring(dotIndex + 1).toLowerCase() : "";
  }
}