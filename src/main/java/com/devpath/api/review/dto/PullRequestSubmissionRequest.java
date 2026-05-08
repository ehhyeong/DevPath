package com.devpath.api.review.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class PullRequestSubmissionRequest {

  private PullRequestSubmissionRequest() {}

  @Schema(name = "PullRequestSubmitRequest", description = "PR 제출 요청")
  public record Create(

      // 인증 연동 전 Swagger 테스트를 위해 제출자 ID를 요청으로 받는다.
      @Schema(description = "제출자 사용자 ID", example = "2") @NotNull(message = "제출자 ID는 필수입니다.")
          Long submitterId,

      // GitHub PR URL 형식만 허용한다.
      @Schema(description = "GitHub PR URL", example = "https://github.com/yongha03/DevPath/pull/1")
          @NotBlank(message = "PR URL은 필수입니다.")
          @Size(max = 1000, message = "PR URL은 1000자 이하여야 합니다.")
          @Pattern(
              regexp = "^https://github\\.com/[^\\s/]+/[^\\s/]+/pull/\\d+.*$",
              message = "GitHub Pull Request URL 형식이어야 합니다.")
          String prUrl,

      // PR 제출 목록과 상세 화면에 표시할 제목이다.
      @Schema(description = "PR 제출 제목", example = "1주차 멘토링 공고 CRUD 구현")
          @NotBlank(message = "PR 제출 제목은 필수입니다.")
          @Size(max = 150, message = "PR 제출 제목은 150자 이하여야 합니다.")
          String title,

      // 구현 내용과 리뷰 요청 사항을 저장한다.
      @Schema(description = "PR 설명", example = "멘토링 공고 CRUD와 Soft Delete 처리를 구현했습니다.")
          @Size(max = 2000, message = "PR 설명은 2000자 이하여야 합니다.")
          String description) {}
}
