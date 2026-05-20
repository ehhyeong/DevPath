package com.devpath.api.workspace.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class WorkspaceErdRequest {

  private WorkspaceErdRequest() {}

  @Schema(name = "WorkspaceErdSaveRequest", description = "Workspace ERD document save request")
  public record Save(
      @Schema(description = "Mermaid ERD code", example = "erDiagram\n    USERS {\n        bigint id PK\n    }")
          @NotBlank(message = "ERD code is required")
          @Size(max = 50000, message = "ERD code must be 50000 characters or fewer")
          String mermaidCode,
      @Schema(description = "ERD editor schema JSON")
          @Size(max = 50000, message = "schemaJson must be 50000 characters or fewer")
          String schemaJson,
      @Schema(description = "Change summary")
          @Size(max = 500, message = "changeSummary must be 500 characters or fewer")
          String changeSummary) {}

  @Schema(name = "WorkspaceErdCommentCreateRequest", description = "ERD comment create request")
  public record CommentCreate(
      @Schema(description = "Target type", example = "TABLE")
          @NotBlank(message = "targetType is required")
          @Size(max = 30, message = "targetType must be 30 characters or fewer")
          String targetType,
      @Schema(description = "Target id", example = "USERS.id")
          @NotBlank(message = "targetId is required")
          @Size(max = 200, message = "targetId must be 200 characters or fewer")
          String targetId,
      @Schema(description = "Target label", example = "USERS.id")
          @Size(max = 200, message = "targetLabel must be 200 characters or fewer")
          String targetLabel,
      @Schema(description = "Comment body")
          @NotBlank(message = "body is required")
          @Size(max = 2000, message = "body must be 2000 characters or fewer")
          String body) {}
}
