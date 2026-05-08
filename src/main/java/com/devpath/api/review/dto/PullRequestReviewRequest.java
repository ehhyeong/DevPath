package com.devpath.api.review.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class PullRequestReviewRequest {

  private PullRequestReviewRequest() {}

  @Schema(name = "PullRequestReviewCreateRequest", description = "PR 코드 리뷰 작성 요청")
  public record Create(

      // 인증 연동 전 Swagger 테스트를 위해 리뷰어 ID를 요청으로 받는다.
      @Schema(description = "리뷰어 사용자 ID", example = "1") @NotNull(message = "리뷰어 ID는 필수입니다.")
          Long reviewerId,

      // 코드 리뷰 코멘트 본문이다.
      @Schema(
              description = "리뷰 코멘트",
              example = "Service 계층의 트랜잭션 범위는 적절하지만, 중복 검증 로직을 private 메서드로 분리하면 좋겠습니다.")
          @NotBlank(message = "리뷰 코멘트는 필수입니다.")
          @Size(max = 3000, message = "리뷰 코멘트는 3000자 이하여야 합니다.")
          String comment) {}

  @Schema(name = "PullRequestReviewDecisionRequest", description = "PR 리뷰 승인/반려 요청")
  public record ReviewDecision(

      // 리뷰 작성자 본인만 승인/반려할 수 있도록 검증한다.
      @Schema(description = "리뷰어 사용자 ID", example = "1") @NotNull(message = "리뷰어 ID는 필수입니다.")
          Long reviewerId) {}

  @Schema(name = "MissionSubmissionDecisionRequest", description = "미션 제출 Pass/Reject 요청")
  public record MissionDecision(

      // 해당 멘토링의 멘토만 최종 판정할 수 있도록 검증한다.
      @Schema(description = "멘토 사용자 ID", example = "1") @NotNull(message = "멘토 ID는 필수입니다.")
          Long mentorId,

      // 최종 판정 피드백이다.
      @Schema(description = "최종 피드백", example = "요구사항을 충족했고 API 응답 포맷도 일관됩니다.")
          @Size(max = 3000, message = "최종 피드백은 3000자 이하여야 합니다.")
          String feedback) {}
}
