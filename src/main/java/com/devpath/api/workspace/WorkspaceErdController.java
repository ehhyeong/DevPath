package com.devpath.api.workspace;

import static com.devpath.common.security.AuthenticationUtils.requireUserId;

import com.devpath.api.workspace.dto.WorkspaceErdRequest;
import com.devpath.api.workspace.dto.WorkspaceErdResponse;
import com.devpath.api.workspace.service.WorkspaceErdService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/workspaces/{workspaceId}/erd")
@RequiredArgsConstructor
@Tag(name = "Workspace ERD API", description = "Squad ERD design API")
public class WorkspaceErdController {

  private final WorkspaceErdService workspaceErdService;

  @GetMapping
  @Operation(summary = "Get ERD document", description = "Returns the workspace ERD document.")
  public ApiResponse<WorkspaceErdResponse.Document> getDocument(
      @Parameter(description = "Workspace ID", example = "1") @PathVariable Long workspaceId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.ok(workspaceErdService.getDocument(workspaceId, requireUserId(userId)));
  }

  @PutMapping
  @Operation(summary = "Save ERD document", description = "Saves the workspace ERD document.")
  public ApiResponse<WorkspaceErdResponse.Document> saveDocument(
      @Parameter(description = "Workspace ID", example = "1") @PathVariable Long workspaceId,
      @Valid @RequestBody WorkspaceErdRequest.Save request,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.ok(
        workspaceErdService.saveDocument(workspaceId, requireUserId(userId), request));
  }

  @GetMapping("/versions")
  @Operation(summary = "Get ERD versions", description = "Returns saved ERD versions.")
  public ApiResponse<List<WorkspaceErdResponse.Version>> getVersions(
      @Parameter(description = "Workspace ID", example = "1") @PathVariable Long workspaceId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.ok(workspaceErdService.getVersions(workspaceId, requireUserId(userId)));
  }

  @GetMapping("/recent-changes")
  @Operation(
      summary = "Get recent ERD changes",
      description = "Returns recent ERD changes for the workspace dashboard.")
  public ApiResponse<List<WorkspaceErdResponse.Version>> getRecentChanges(
      @Parameter(description = "Workspace ID", example = "1") @PathVariable Long workspaceId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.ok(workspaceErdService.getRecentChanges(workspaceId, requireUserId(userId)));
  }

  @GetMapping("/versions/{version}")
  @Operation(summary = "Get ERD version", description = "Returns one saved ERD version.")
  public ApiResponse<WorkspaceErdResponse.Version> getVersion(
      @Parameter(description = "Workspace ID", example = "1") @PathVariable Long workspaceId,
      @PathVariable Integer version,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.ok(
        workspaceErdService.getVersion(workspaceId, version, requireUserId(userId)));
  }

  @GetMapping("/comments")
  @Operation(summary = "Get ERD comments", description = "Returns ERD comments.")
  public ApiResponse<List<WorkspaceErdResponse.Comment>> getComments(
      @Parameter(description = "Workspace ID", example = "1") @PathVariable Long workspaceId,
      @RequestParam(required = false) String targetType,
      @RequestParam(required = false) String targetId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.ok(
        workspaceErdService.getComments(workspaceId, requireUserId(userId), targetType, targetId));
  }

  @PostMapping("/comments")
  @Operation(summary = "Create ERD comment", description = "Creates an ERD comment.")
  public ApiResponse<WorkspaceErdResponse.Comment> createComment(
      @Parameter(description = "Workspace ID", example = "1") @PathVariable Long workspaceId,
      @Valid @RequestBody WorkspaceErdRequest.CommentCreate request,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.ok(
        workspaceErdService.createComment(workspaceId, requireUserId(userId), request));
  }

  @DeleteMapping("/comments/{commentId}")
  @Operation(summary = "Delete ERD comment", description = "Soft-deletes the viewer's ERD comment.")
  public ApiResponse<Void> deleteComment(
      @Parameter(description = "Workspace ID", example = "1") @PathVariable Long workspaceId,
      @PathVariable Long commentId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    workspaceErdService.deleteComment(workspaceId, requireUserId(userId), commentId);
    return ApiResponse.ok(null);
  }
}
