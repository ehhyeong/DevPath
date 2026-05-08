package com.devpath.api.ai.dto;

import com.devpath.domain.ai.entity.AiDesignReview;
import com.devpath.domain.ai.entity.AiDesignSuggestion;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import java.util.List;

public class AiDesignReviewResponse {

  private AiDesignReviewResponse() {}

  @Schema(name = "AiDesignReviewDetailResponse", description = "AI 설계 리뷰 상세 응답")
  public record Detail(
      @Schema(description = "AI 설계 리뷰 ID", example = "1") Long reviewId,
      @Schema(description = "요청자 ID", example = "1") Long requesterId,
      @Schema(description = "요청자 이름", example = "김멘토") String requesterName,
      @Schema(description = "설계 리뷰 제목", example = "멘토링/PR 리뷰 도메인 설계 검토") String title,
      @Schema(description = "ERD 텍스트", example = "users ||--o{ career_profiles : owns")
          String erdText,
      @Schema(description = "API 명세 텍스트", example = "POST /api/career-profiles") String apiSpecText,
      @Schema(description = "설계 리뷰 요약", example = "Soft Delete와 인덱스 전략을 함께 검토해야 합니다.")
          String summary,
      @Schema(description = "리뷰 Provider 이름", example = "RULE_BASED_DESIGN") String providerName,
      @Schema(description = "개선 제안 목록", example = "[{\"suggestionId\":1,\"priority\":\"HIGH\"}]")
          List<SuggestionDetail> suggestions,
      @Schema(description = "생성일시", example = "2026-05-03T21:00:00") LocalDateTime createdAt,
      @Schema(description = "수정일시", example = "2026-05-03T21:10:00") LocalDateTime updatedAt) {
    // AI 설계 리뷰와 개선 제안 목록을 상세 응답 DTO로 변환한다.
    public static Detail from(AiDesignReview review, List<AiDesignSuggestion> suggestions) {
      return new Detail(
          review.getId(),
          review.getRequester().getId(),
          review.getRequester().getName(),
          review.getTitle(),
          review.getErdText(),
          review.getApiSpecText(),
          review.getSummary(),
          review.getProviderName(),
          suggestions.stream().map(SuggestionDetail::from).toList(),
          review.getCreatedAt(),
          review.getUpdatedAt());
    }
  }

  @Schema(name = "AiDesignSuggestionDetailResponse", description = "AI 설계 개선 제안 응답")
  public record SuggestionDetail(
      @Schema(description = "개선 제안 ID", example = "1") Long suggestionId,
      @Schema(description = "AI 설계 리뷰 ID", example = "1") Long reviewId,
      @Schema(description = "제안 작성자 ID", example = "1") Long createdByUserId,
      @Schema(description = "제안 작성자 이름", example = "김멘토") String createdByUserName,
      @Schema(description = "제안 카테고리", example = "DATABASE") String category,
      @Schema(description = "제안 제목", example = "Soft Delete 컬럼 인덱스 검토") String title,
      @Schema(description = "제안 내용", example = "is_deleted 컬럼과 조회 조건에 맞는 복합 인덱스를 검토하세요.")
          String content,
      @Schema(description = "우선순위", example = "HIGH") String priority,
      @Schema(description = "생성일시", example = "2026-05-03T21:10:00") LocalDateTime createdAt) {
    // AI 설계 개선 제안 Entity를 응답 DTO로 변환한다.
    public static SuggestionDetail from(AiDesignSuggestion suggestion) {
      return new SuggestionDetail(
          suggestion.getId(),
          suggestion.getDesignReview().getId(),
          suggestion.getCreatedBy().getId(),
          suggestion.getCreatedBy().getName(),
          suggestion.getCategory(),
          suggestion.getTitle(),
          suggestion.getContent(),
          suggestion.getPriority(),
          suggestion.getCreatedAt());
    }
  }
}
