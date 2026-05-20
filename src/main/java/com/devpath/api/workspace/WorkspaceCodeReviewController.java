package com.devpath.api.workspace;

import static com.devpath.common.security.AuthenticationUtils.requireUserId;

import com.devpath.api.workspace.dto.WorkspaceCodeReviewRequest;
import com.devpath.api.workspace.dto.WorkspaceCodeReviewResponse;
import com.devpath.api.workspace.service.WorkspaceCodeReviewService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/workspaces/{workspaceId}/code-reviews")
@RequiredArgsConstructor
@Tag(name = "Workspace Code Review API", description = "스쿼드 코드 피드백 API")
public class WorkspaceCodeReviewController {

  private final WorkspaceCodeReviewService workspaceCodeReviewService;

  @GetMapping
  @Operation(summary = "스쿼드 코드 리뷰 보드 조회", description = "워크스페이스의 열린/닫힌 코드 리뷰 요청을 조회합니다.")
  public ApiResponse<WorkspaceCodeReviewResponse.Board> getBoard(
      @Parameter(description = "워크스페이스 ID", example = "1") @PathVariable Long workspaceId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.ok(
        workspaceCodeReviewService.getBoard(workspaceId, requireUserId(userId)));
  }

  @GetMapping("/{reviewId}")
  @Operation(summary = "스쿼드 코드 리뷰 상세 조회", description = "리뷰 요청 상세와 AI 리뷰 결과를 조회합니다.")
  public ApiResponse<WorkspaceCodeReviewResponse.Detail> getDetail(
      @Parameter(description = "워크스페이스 ID", example = "1") @PathVariable Long workspaceId,
      @Parameter(description = "리뷰 요청 ID", example = "9") @PathVariable Long reviewId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.ok(
        workspaceCodeReviewService.getDetail(workspaceId, reviewId, requireUserId(userId)));
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  @Operation(summary = "스쿼드 코드 리뷰 요청 생성", description = "GitHub PR 또는 수동 diff 기반 코드 리뷰 요청을 생성합니다.")
  public ApiResponse<WorkspaceCodeReviewResponse.Detail> createReviewRequest(
      @Parameter(description = "워크스페이스 ID", example = "1") @PathVariable Long workspaceId,
      @Valid @RequestBody WorkspaceCodeReviewRequest.Create request,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.ok(
        workspaceCodeReviewService.createReviewRequest(
            workspaceId, requireUserId(userId), request));
  }

  @PostMapping("/{reviewId}/ai-review")
  @Operation(summary = "AI 시니어 멘토 리뷰 생성", description = "Gemini 기반 AI 코드 리뷰를 생성하고 요청에 연결합니다.")
  public ApiResponse<WorkspaceCodeReviewResponse.Detail> createAiReview(
      @Parameter(description = "워크스페이스 ID", example = "1") @PathVariable Long workspaceId,
      @Parameter(description = "리뷰 요청 ID", example = "9") @PathVariable Long reviewId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.ok(
        workspaceCodeReviewService.createAiReview(workspaceId, reviewId, requireUserId(userId)));
  }

  @PostMapping("/{reviewId}/close")
  @Operation(summary = "코드 리뷰 요청 닫기", description = "열린 코드 리뷰 요청을 닫힘 상태로 변경합니다.")
  public ApiResponse<WorkspaceCodeReviewResponse.Detail> closeReview(
      @Parameter(description = "워크스페이스 ID", example = "1") @PathVariable Long workspaceId,
      @Parameter(description = "리뷰 요청 ID", example = "9") @PathVariable Long reviewId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.ok(
        workspaceCodeReviewService.closeReview(workspaceId, reviewId, requireUserId(userId)));
  }

  @PostMapping("/{reviewId}/merge")
  @Operation(summary = "코드 리뷰 요청 머지 처리", description = "AI 리뷰가 완료된 코드 리뷰 요청을 머지 상태로 변경합니다.")
  public ApiResponse<WorkspaceCodeReviewResponse.Detail> mergeReview(
      @Parameter(description = "워크스페이스 ID", example = "1") @PathVariable Long workspaceId,
      @Parameter(description = "리뷰 요청 ID", example = "9") @PathVariable Long reviewId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.ok(
        workspaceCodeReviewService.mergeReview(workspaceId, reviewId, requireUserId(userId)));
  }

  @PostMapping("/{reviewId}/comments")
  @ResponseStatus(HttpStatus.CREATED)
  @Operation(summary = "팀원 피드백 등록", description = "스쿼드 코드 리뷰 요청에 팀원 피드백을 등록합니다.")
  public ApiResponse<WorkspaceCodeReviewResponse.Detail> createComment(
      @Parameter(description = "워크스페이스 ID", example = "1") @PathVariable Long workspaceId,
      @Parameter(description = "리뷰 요청 ID", example = "9") @PathVariable Long reviewId,
      @Valid @RequestBody WorkspaceCodeReviewRequest.CommentCreate request,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.ok(
        workspaceCodeReviewService.createComment(
            workspaceId, reviewId, requireUserId(userId), request));
  }
}
