package com.devpath.api.workspace.notice;

import com.devpath.api.workspace.notice.dto.NoticeCreateRequest;
import com.devpath.api.workspace.notice.dto.NoticeResponse;
import com.devpath.api.workspace.notice.dto.NoticeUpdateRequest;
import com.devpath.common.response.ApiResponse;
import com.devpath.common.security.AuthenticationUtils;
import com.devpath.domain.operation.notice.WorkspaceNoticeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Workspace Notice", description = "Workspace notice APIs")
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class WorkspaceNoticeController {

  private final WorkspaceNoticeService noticeService;

  @Operation(summary = "Publish workspace notice")
  @PostMapping("/workspaces/{workspaceId}/notices")
  public ResponseEntity<ApiResponse<NoticeResponse>> createNotice(
      @Parameter(description = "Workspace ID") @PathVariable Long workspaceId,
      @Valid @RequestBody NoticeCreateRequest request) {
    NoticeResponse response = noticeService.createNotice(workspaceId, request);
    return ResponseEntity.ok(ApiResponse.success(response));
  }

  @Operation(summary = "List workspace notices")
  @GetMapping("/workspaces/{workspaceId}/notices")
  public ResponseEntity<ApiResponse<List<NoticeResponse>>> getNotices(
      @Parameter(description = "Workspace ID") @PathVariable Long workspaceId) {
    List<NoticeResponse> responses = noticeService.getNoticesByWorkspace(workspaceId);
    return ResponseEntity.ok(ApiResponse.success(responses));
  }

  @Operation(summary = "Get workspace notice detail")
  @GetMapping("/workspace-notices/{noticeId}")
  public ResponseEntity<ApiResponse<NoticeResponse>> getNoticeDetail(
      @Parameter(description = "Notice ID") @PathVariable Long noticeId) {
    NoticeResponse response = noticeService.getNotice(noticeId);
    return ResponseEntity.ok(ApiResponse.success(response));
  }

  @Operation(summary = "Update workspace notice")
  @PatchMapping("/workspace-notices/{noticeId}")
  public ResponseEntity<ApiResponse<NoticeResponse>> updateNotice(
      @Parameter(description = "Notice ID") @PathVariable Long noticeId,
      @Valid @RequestBody NoticeUpdateRequest request) {
    NoticeResponse response = noticeService.updateNotice(noticeId, request);
    return ResponseEntity.ok(ApiResponse.success(response));
  }

  @Operation(summary = "Delete workspace notice")
  @DeleteMapping("/workspace-notices/{noticeId}")
  public ResponseEntity<ApiResponse<Void>> deleteNotice(
      @Parameter(description = "Notice ID") @PathVariable Long noticeId) {
    noticeService.deleteNotice(noticeId);
    return ResponseEntity.ok(ApiResponse.success("Workspace notice deleted.", null));
  }

  @Operation(summary = "Mark workspace notice as read")
  @PostMapping("/workspace-notices/{noticeId}/read")
  public ResponseEntity<ApiResponse<Void>> markNoticeAsRead(
      @Parameter(description = "Notice ID") @PathVariable Long noticeId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    noticeService.markAsRead(noticeId, AuthenticationUtils.requireUserId(userId));
    return ResponseEntity.ok(ApiResponse.success("Workspace notice marked as read.", null));
  }

  @Operation(summary = "List unread workspace notices")
  @GetMapping("/workspaces/{workspaceId}/notices/unread")
  public ResponseEntity<ApiResponse<List<NoticeResponse>>> getUnreadNotices(
      @Parameter(description = "Workspace ID") @PathVariable Long workspaceId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    List<NoticeResponse> responses =
        noticeService.getUnreadNotices(workspaceId, AuthenticationUtils.requireUserId(userId));
    return ResponseEntity.ok(ApiResponse.success(responses));
  }

  @Operation(summary = "Count unread workspace notices")
  @GetMapping("/workspaces/{workspaceId}/notices/unread/count")
  public ResponseEntity<ApiResponse<Long>> getUnreadNoticeCount(
      @Parameter(description = "Workspace ID") @PathVariable Long workspaceId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    long count =
        noticeService.getUnreadNoticeCount(workspaceId, AuthenticationUtils.requireUserId(userId));
    return ResponseEntity.ok(ApiResponse.success(count));
  }
}
