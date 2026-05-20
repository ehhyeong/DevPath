package com.devpath.api.workspace.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import java.util.List;

public class WorkspaceErdResponse {

  private WorkspaceErdResponse() {}

  @Schema(name = "WorkspaceErdDocumentResponse", description = "Workspace ERD document response")
  public record Document(
      @Schema(description = "Workspace ID", example = "1") Long workspaceId,
      @Schema(description = "Project name") String projectName,
      @Schema(description = "Mermaid ERD code") String mermaidCode,
      @Schema(description = "ERD editor schema JSON") String schemaJson,
      @Schema(description = "Document version", example = "3") Integer version,
      @Schema(description = "Last updater ID", example = "2") Long updatedById,
      @Schema(description = "Last updater name", example = "Kim") String updatedByName,
      @Schema(description = "Last updated at") LocalDateTime updatedAt,
      @Schema(description = "Workspace members") List<WorkspaceMemberResponse> members) {}

  @Schema(name = "WorkspaceErdVersionResponse", description = "Workspace ERD version response")
  public record Version(
      @Schema(description = "Version row ID", example = "10") Long versionId,
      @Schema(description = "Workspace ID", example = "1") Long workspaceId,
      @Schema(description = "Version number", example = "3") Integer version,
      @Schema(description = "Mermaid ERD code") String mermaidCode,
      @Schema(description = "ERD editor schema JSON") String schemaJson,
      @Schema(description = "Change summary") String summary,
      @Schema(description = "Updater ID", example = "2") Long updatedById,
      @Schema(description = "Updater name", example = "Kim") String updatedByName,
      @Schema(description = "Linked discussion chat message ID") Long discussionMessageId,
      @Schema(description = "Created at") LocalDateTime createdAt) {}

  @Schema(name = "WorkspaceErdCommentResponse", description = "Workspace ERD comment response")
  public record Comment(
      @Schema(description = "Comment ID", example = "1") Long commentId,
      @Schema(description = "Workspace ID", example = "1") Long workspaceId,
      @Schema(description = "Target type", example = "COLUMN") String targetType,
      @Schema(description = "Target ID", example = "USERS.id") String targetId,
      @Schema(description = "Target label", example = "USERS.id") String targetLabel,
      @Schema(description = "Author ID", example = "2") Long authorId,
      @Schema(description = "Author name", example = "Kim") String authorName,
      @Schema(description = "Comment body") String body,
      @Schema(description = "Whether the viewer wrote this comment") Boolean isMine,
      @Schema(description = "Created at") LocalDateTime createdAt) {}
}
