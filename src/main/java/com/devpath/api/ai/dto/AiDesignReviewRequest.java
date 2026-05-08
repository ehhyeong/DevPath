package com.devpath.api.ai.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class AiDesignReviewRequest {

  private AiDesignReviewRequest() {}

  @Schema(name = "AiDesignReviewCreateRequest", description = "AI 설계 리뷰 요청")
  public record Create(

      // 인증 연동 전 Swagger 테스트를 위해 요청자 ID를 받는다.
      @Schema(description = "AI 설계 리뷰 요청자 ID", example = "1") @NotNull(message = "요청자 ID는 필수입니다.")
          Long requesterId,

      // 설계 리뷰 제목이다.
      @Schema(description = "설계 리뷰 제목", example = "멘토링/PR 리뷰 도메인 설계 검토")
          @NotBlank(message = "설계 리뷰 제목은 필수입니다.")
          @Size(max = 150, message = "설계 리뷰 제목은 150자 이하여야 합니다.")
          String title,

      // ERD 또는 테이블 설계 텍스트다.
      @Schema(
              description = "ERD 텍스트",
              example =
                  "users 1:N mentorings, mentorings 1:N mentoring_missions, mentoring_missions 1:N mission_submissions")
          @NotBlank(message = "ERD 텍스트는 필수입니다.")
          @Size(max = 30000, message = "ERD 텍스트는 30000자 이하여야 합니다.")
          String erdText,

      // API 명세 텍스트다.
      @Schema(
              description = "API 명세 텍스트",
              example =
                  "POST /api/mentorings/{mentoringId}/missions, GET /api/mentorings/{mentoringId}/missions")
          @NotBlank(message = "API 명세 텍스트는 필수입니다.")
          @Size(max = 30000, message = "API 명세 텍스트는 30000자 이하여야 합니다.")
          String apiSpecText) {}

  @Schema(name = "AiDesignSuggestionCreateRequest", description = "AI 설계 개선 제안 저장 요청")
  public record SuggestionCreate(

      // 인증 연동 전 Swagger 테스트를 위해 작성자 ID를 받는다.
      @Schema(description = "제안 작성자 ID", example = "1") @NotNull(message = "제안 작성자 ID는 필수입니다.")
          Long createdByUserId,

      // 개선 제안 카테고리다.
      @Schema(description = "제안 카테고리", example = "DATABASE")
          @NotBlank(message = "제안 카테고리는 필수입니다.")
          @Size(max = 100, message = "제안 카테고리는 100자 이하여야 합니다.")
          String category,

      // 개선 제안 제목이다.
      @Schema(description = "제안 제목", example = "Soft Delete 컬럼 인덱스 검토")
          @NotBlank(message = "제안 제목은 필수입니다.")
          @Size(max = 150, message = "제안 제목은 150자 이하여야 합니다.")
          String title,

      // 개선 제안 상세 내용이다.
      @Schema(
              description = "제안 내용",
              example = "is_deleted=false 조건이 자주 사용되므로 조회 빈도가 높은 테이블은 인덱스 전략을 검토하세요.")
          @NotBlank(message = "제안 내용은 필수입니다.")
          @Size(max = 5000, message = "제안 내용은 5000자 이하여야 합니다.")
          String content,

      // 개선 우선순위다.
      @Schema(description = "우선순위", example = "HIGH")
          @NotBlank(message = "우선순위는 필수입니다.")
          @Size(max = 20, message = "우선순위는 20자 이하여야 합니다.")
          String priority) {}
}
