package com.devpath.api.workspace.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class UpdateWorkspaceDocRequest {

  @Schema(
      description = "문서 내용 (Markdown 형식 권장)",
      example = "# ERD\n\n```mermaid\nerDiagram\n  USER ||--o{ ORDER : places\n```")
  private String content;
}
