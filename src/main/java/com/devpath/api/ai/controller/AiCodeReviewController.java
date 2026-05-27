package com.devpath.api.ai.controller;

import com.devpath.api.ai.dto.AiCodeReviewRequest;
import com.devpath.api.ai.dto.AiCodeReviewResponse;
import com.devpath.api.ai.service.AiCodeReviewService;
import com.devpath.common.response.ApiResponse;
import com.devpath.common.swagger.SwaggerTag;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = SwaggerTag.AI_CODE_REVIEW, description = "AI 코드 리뷰 및 리뷰 코멘트 승인/반려 API")
@RestController
@RequiredArgsConstructor
public class AiCodeReviewController {

  private final AiCodeReviewService aiCodeReviewService;

  @PostMapping("/api/ai/code-reviews")
  @Operation(summary = "AI 코드 리뷰 요청", description = "diffText 기반으로 rule-based AI 코드 리뷰 결과를 생성합니다.")
  public ResponseEntity<ApiResponse<AiCodeReviewResponse.Detail>> createReview(
      @Parameter(hidden = true) @AuthenticationPrincipal Long requesterId,
      @Valid @RequestBody AiCodeReviewRequest.Create request) {
    // Controller는 요청 검증, Service 호출, 공통 응답 반환만 담당한다.
    return ResponseEntity.ok(
        ApiResponse.ok(aiCodeReviewService.createReview(requesterId, request)));
  }

  @GetMapping("/api/ai/code-reviews/{reviewId}")
  @Operation(summary = "AI 코드 리뷰 단건 조회", description = "AI 코드 리뷰 상세와 코멘트 목록을 조회합니다.")
  public ResponseEntity<ApiResponse<AiCodeReviewResponse.Detail>> getReview(
      @PathVariable Long reviewId) {
    // AI 리뷰 상세와 코멘트 목록을 함께 반환한다.
    return ResponseEntity.ok(ApiResponse.ok(aiCodeReviewService.getReview(reviewId)));
  }

  @GetMapping("/api/ai/code-reviews/history")
  @Operation(summary = "AI 코드 리뷰 히스토리 조회", description = "요청자 기준 AI 코드 리뷰 히스토리를 최신순으로 조회합니다.")
  public ResponseEntity<ApiResponse<List<AiCodeReviewResponse.Summary>>> getHistory(
      @Parameter(hidden = true) @AuthenticationPrincipal Long requesterId) {
    // requesterId 기준으로 본인이 요청한 AI 리뷰 히스토리를 반환한다.
    return ResponseEntity.ok(ApiResponse.ok(aiCodeReviewService.getHistory(requesterId)));
  }

  @PatchMapping("/api/ai/review-comments/{commentId}/accept")
  @Operation(summary = "AI 리뷰 코멘트 승인", description = "AI 리뷰 코멘트를 ACCEPTED 상태로 변경합니다.")
  public ResponseEntity<ApiResponse<AiCodeReviewResponse.CommentDetail>> acceptComment(
      @PathVariable Long commentId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long requesterId,
      @Valid @RequestBody(required = false) AiCodeReviewRequest.CommentDecision request) {
    // 코멘트 승인 권한 검증은 Service에서 처리한다.
    return ResponseEntity.ok(
        ApiResponse.ok(aiCodeReviewService.acceptComment(commentId, requesterId)));
  }

  @PatchMapping("/api/ai/review-comments/{commentId}/reject")
  @Operation(summary = "AI 리뷰 코멘트 반려", description = "AI 리뷰 코멘트를 REJECTED 상태로 변경합니다.")
  public ResponseEntity<ApiResponse<AiCodeReviewResponse.CommentDetail>> rejectComment(
      @PathVariable Long commentId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long requesterId,
      @Valid @RequestBody(required = false) AiCodeReviewRequest.CommentDecision request) {
    // 코멘트 반려 권한 검증은 Service에서 처리한다.
    return ResponseEntity.ok(
        ApiResponse.ok(aiCodeReviewService.rejectComment(commentId, requesterId)));
  }
}
