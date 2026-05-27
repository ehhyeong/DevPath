package com.devpath.api.ai.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class AiCodeReviewRequest {

  private AiCodeReviewRequest() {}

  @Schema(name = "AiCodeReviewCreateRequest", description = "AI 코드 리뷰 요청")
  public record Create(
      @Schema(hidden = true) Long requesterId,

      // PR 제출과 연결할 경우 사용한다. diffText만 리뷰할 때는 null 가능하다.
      @Schema(description = "PR 제출 ID", example = "1") Long pullRequestId,

      // AI 리뷰 제목이다.
      @Schema(description = "AI 리뷰 제목", example = "1주차 PR 자동 리뷰")
          @NotBlank(message = "AI 리뷰 제목은 필수입니다.")
          @Size(max = 150, message = "AI 리뷰 제목은 150자 이하여야 합니다.")
          String title,

      // 리뷰 대상 diff 원문이다.
      @Schema(
              description = "리뷰 대상 diff 또는 코드 텍스트",
              example =
                  "+ @Data\n+ @ManyToOne(fetch = FetchType.EAGER)\n+ private String password;\n+ // TODO: fix later")
          @NotBlank(message = "diffText는 필수입니다.")
          @Size(max = 30000, message = "diffText는 30000자 이하여야 합니다.")
          String diffText) {}

  @Schema(name = "AiReviewCommentDecisionRequest", description = "AI 리뷰 코멘트 승인/반려 요청")
  public record CommentDecision(@Schema(hidden = true) Long requesterId) {}
}
