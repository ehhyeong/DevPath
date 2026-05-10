package com.devpath.api.review.controller;

import com.devpath.api.review.dto.PullRequestReviewRequest;
import com.devpath.api.review.dto.PullRequestReviewResponse;
import com.devpath.api.review.dto.PullRequestSubmissionRequest;
import com.devpath.api.review.service.PullRequestReviewService;
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

@Tag(name = SwaggerTag.PR_REVIEW, description = "PR 제출, 코드 리뷰, Pass/Reject API")
@RestController
@RequiredArgsConstructor
public class PullRequestReviewController {

  private final PullRequestReviewService pullRequestReviewService;

  @PostMapping("/api/mentoring-missions/{missionId}/pull-requests")
  @Operation(summary = "PR 링크 제출", description = "멘토링 미션에 PR 링크를 제출합니다.")
  public ResponseEntity<ApiResponse<PullRequestReviewResponse.PullRequestDetail>> submitPullRequest(
      @PathVariable Long missionId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long submitterId,
      @Valid @RequestBody PullRequestSubmissionRequest.Create request) {
    // Controller는 요청 검증, Service 호출, 공통 응답 반환만 담당한다.
    return ResponseEntity.ok(
        ApiResponse.ok(pullRequestReviewService.submitPullRequest(missionId, submitterId, request)));
  }

  @GetMapping("/api/mentorings/{mentoringId}/pull-requests")
  @Operation(summary = "멘토링별 PR 목록 조회", description = "멘토링 ID 기준 PR 제출 목록을 조회합니다.")
  public ResponseEntity<ApiResponse<List<PullRequestReviewResponse.PullRequestSummary>>>
      getPullRequests(@PathVariable Long mentoringId) {
    // 멘토링 ID 기준으로 삭제되지 않은 PR 제출 목록을 조회한다.
    return ResponseEntity.ok(ApiResponse.ok(pullRequestReviewService.getPullRequests(mentoringId)));
  }

  @GetMapping("/api/pull-requests/{pullRequestId}")
  @Operation(summary = "PR 단건 조회", description = "PR 제출 상세 정보를 조회합니다.")
  public ResponseEntity<ApiResponse<PullRequestReviewResponse.PullRequestDetail>> getPullRequest(
      @PathVariable Long pullRequestId) {
    // PR 상세와 연결된 리뷰 목록을 함께 반환한다.
    return ResponseEntity.ok(
        ApiResponse.ok(pullRequestReviewService.getPullRequest(pullRequestId)));
  }

  @PostMapping("/api/pull-requests/{pullRequestId}/reviews")
  @Operation(summary = "PR 코드 리뷰 작성", description = "멘토 또는 강사가 PR 코드 리뷰를 작성합니다.")
  public ResponseEntity<ApiResponse<PullRequestReviewResponse.ReviewDetail>> createReview(
      @PathVariable Long pullRequestId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long reviewerId,
      @Valid @RequestBody PullRequestReviewRequest.Create request) {
    // 리뷰 작성 권한 검증은 Service에서 처리한다.
    return ResponseEntity.ok(
        ApiResponse.ok(pullRequestReviewService.createReview(pullRequestId, reviewerId, request)));
  }

  @PatchMapping("/api/pull-request-reviews/{reviewId}/approve")
  @Operation(summary = "PR 리뷰 승인", description = "작성된 PR 리뷰 코멘트를 승인 상태로 변경합니다.")
  public ResponseEntity<ApiResponse<PullRequestReviewResponse.ReviewDetail>> approveReview(
      @PathVariable Long reviewId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long reviewerId,
      @Valid @RequestBody(required = false) PullRequestReviewRequest.ReviewDecision request) {
    // 리뷰 작성자 본인 검증은 Service에서 처리한다.
    return ResponseEntity.ok(
        ApiResponse.ok(pullRequestReviewService.approveReview(reviewId, reviewerId)));
  }

  @PatchMapping("/api/pull-request-reviews/{reviewId}/reject")
  @Operation(summary = "PR 리뷰 반려", description = "작성된 PR 리뷰 코멘트를 반려 상태로 변경합니다.")
  public ResponseEntity<ApiResponse<PullRequestReviewResponse.ReviewDetail>> rejectReview(
      @PathVariable Long reviewId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long reviewerId,
      @Valid @RequestBody(required = false) PullRequestReviewRequest.ReviewDecision request) {
    // 리뷰 작성자 본인 검증은 Service에서 처리한다.
    return ResponseEntity.ok(
        ApiResponse.ok(pullRequestReviewService.rejectReview(reviewId, reviewerId)));
  }

  @PatchMapping("/api/mission-submissions/{submissionId}/pass")
  @Operation(summary = "미션 제출 Pass 처리", description = "미션 제출을 PASSED 상태로 변경합니다.")
  public ResponseEntity<ApiResponse<PullRequestReviewResponse.MissionSubmissionDetail>>
      passSubmission(
          @PathVariable Long submissionId,
          @Parameter(hidden = true) @AuthenticationPrincipal Long mentorId,
          @Valid @RequestBody(required = false) PullRequestReviewRequest.MissionDecision request) {
    // Pass 판정 권한과 중복 판정 검증은 Service에서 처리한다.
    return ResponseEntity.ok(
        ApiResponse.ok(pullRequestReviewService.passSubmission(submissionId, mentorId, request)));
  }

  @PatchMapping("/api/mission-submissions/{submissionId}/reject")
  @Operation(summary = "미션 제출 Reject 처리", description = "미션 제출을 REJECTED 상태로 변경합니다.")
  public ResponseEntity<ApiResponse<PullRequestReviewResponse.MissionSubmissionDetail>>
      rejectSubmission(
          @PathVariable Long submissionId,
          @Parameter(hidden = true) @AuthenticationPrincipal Long mentorId,
          @Valid @RequestBody(required = false) PullRequestReviewRequest.MissionDecision request) {
    // Reject 판정 권한과 중복 판정 검증은 Service에서 처리한다.
    return ResponseEntity.ok(
        ApiResponse.ok(pullRequestReviewService.rejectSubmission(submissionId, mentorId, request)));
  }
}
