package com.devpath.api.review.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class PullRequestReviewRequest {

  private PullRequestReviewRequest() {}

  @Schema(name = "PullRequestReviewCreateRequest", description = "PR 코드 리뷰 작성 요청")
  public record Create(
      @Schema(hidden = true) Long reviewerId,

      // 코드 리뷰 코멘트 본문이다.
      @Schema(
              description = "리뷰 코멘트",
              example = "Service 계층의 트랜잭션 범위는 적절하지만, 중복 검증 로직을 private 메서드로 분리하면 좋겠습니다.")
          @NotBlank(message = "리뷰 코멘트는 필수입니다.")
          @Size(max = 3000, message = "리뷰 코멘트는 3000자 이하여야 합니다.")
          String comment) {}

  @Schema(name = "PullRequestReviewDecisionRequest", description = "PR 리뷰 승인/반려 요청")
  public record ReviewDecision(@Schema(hidden = true) Long reviewerId) {}

  @Schema(name = "MissionSubmissionDecisionRequest", description = "미션 제출 Pass/Reject 요청")
  public record MissionDecision(
      @Schema(hidden = true) Long mentorId,

      // 최종 판정 피드백이다.
      @Schema(description = "최종 피드백", example = "요구사항을 충족했고 API 응답 포맷도 일관됩니다.")
          @Size(max = 3000, message = "최종 피드백은 3000자 이하여야 합니다.")
          String feedback) {}
}
