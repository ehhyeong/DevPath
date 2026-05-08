package com.devpath.api.ai.dto;

import com.devpath.domain.ai.entity.AiCodeReview;
import com.devpath.domain.ai.entity.AiReviewComment;
import com.devpath.domain.ai.entity.AiReviewCommentStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import java.util.List;

public class AiCodeReviewResponse {

  private AiCodeReviewResponse() {}

  @Schema(name = "AiCodeReviewSummaryResponse", description = "AI 코드 리뷰 히스토리 응답")
  public record Summary(
      @Schema(description = "AI 코드 리뷰 ID", example = "1") Long reviewId,
      @Schema(description = "PR 제출 ID", example = "1") Long pullRequestId,
      @Schema(description = "AI 리뷰 제목", example = "1주차 PR 자동 리뷰") String title,
      @Schema(description = "AI 리뷰 요약", example = "총 4개의 컨벤션 위반 가능성이 감지되었습니다.") String summary,
      @Schema(description = "코멘트 개수", example = "4") Integer commentCount,
      @Schema(description = "리뷰 Provider 이름", example = "RULE_BASED") String providerName,
      @Schema(description = "생성일시", example = "2026-05-03T20:00:00") LocalDateTime createdAt) {
    // AI 리뷰 히스토리에 필요한 요약 정보를 DTO로 변환한다.
    public static Summary from(AiCodeReview review) {
      return new Summary(
          review.getId(),
          review.getPullRequestSubmission() == null
              ? null
              : review.getPullRequestSubmission().getId(),
          review.getTitle(),
          review.getSummary(),
          review.getCommentCount(),
          review.getProviderName(),
          review.getCreatedAt());
    }
  }

  @Schema(name = "AiCodeReviewDetailResponse", description = "AI 코드 리뷰 상세 응답")
  public record Detail(
      @Schema(description = "AI 코드 리뷰 ID", example = "1") Long reviewId,
      @Schema(description = "요청자 ID", example = "2") Long requesterId,
      @Schema(description = "요청자 이름", example = "이학습") String requesterName,
      @Schema(description = "PR 제출 ID", example = "1") Long pullRequestId,
      @Schema(description = "AI 리뷰 제목", example = "1주차 PR 자동 리뷰") String title,
      @Schema(description = "AI 리뷰 요약", example = "총 4개의 컨벤션 위반 가능성이 감지되었습니다.") String summary,
      @Schema(description = "코멘트 개수", example = "4") Integer commentCount,
      @Schema(description = "리뷰 Provider 이름", example = "RULE_BASED") String providerName,
      @Schema(description = "AI 리뷰 코멘트 목록", example = "[{\"commentId\":1,\"status\":\"PENDING\"}]")
          List<CommentDetail> comments,
      @Schema(description = "생성일시", example = "2026-05-03T20:00:00") LocalDateTime createdAt) {
    // AI 코드 리뷰와 코멘트 목록을 상세 응답 DTO로 변환한다.
    public static Detail from(AiCodeReview review, List<AiReviewComment> comments) {
      return new Detail(
          review.getId(),
          review.getRequester().getId(),
          review.getRequester().getName(),
          review.getPullRequestSubmission() == null
              ? null
              : review.getPullRequestSubmission().getId(),
          review.getTitle(),
          review.getSummary(),
          review.getCommentCount(),
          review.getProviderName(),
          comments.stream().map(CommentDetail::from).toList(),
          review.getCreatedAt());
    }
  }

  @Schema(name = "AiReviewCommentDetailResponse", description = "AI 리뷰 코멘트 상세 응답")
  public record CommentDetail(
      @Schema(description = "AI 리뷰 코멘트 ID", example = "1") Long commentId,
      @Schema(description = "AI 코드 리뷰 ID", example = "1") Long reviewId,
      @Schema(description = "카테고리", example = "LOMBOK_CONVENTION") String category,
      @Schema(description = "라인 번호", example = "10") Integer lineNumber,
      @Schema(description = "코멘트 제목", example = "@Data 사용 감지") String title,
      @Schema(description = "코멘트 메시지", example = "@Data는 무분별한 setter와 순환 참조 위험을 만들 수 있습니다.")
          String message,
      @Schema(
              description = "개선 제안",
              example =
                  "@Getter, @NoArgsConstructor(access = AccessLevel.PROTECTED), @Builder 조합을 사용하세요.")
          String suggestion,
      @Schema(description = "코멘트 상태", example = "PENDING") AiReviewCommentStatus status,
      @Schema(description = "처리일시", example = "2026-05-03T20:10:00") LocalDateTime decidedAt,
      @Schema(description = "생성일시", example = "2026-05-03T20:00:00") LocalDateTime createdAt) {
    // AI 리뷰 코멘트 Entity를 응답 DTO로 변환한다.
    public static CommentDetail from(AiReviewComment comment) {
      return new CommentDetail(
          comment.getId(),
          comment.getAiCodeReview().getId(),
          comment.getCategory(),
          comment.getLineNumber(),
          comment.getTitle(),
          comment.getMessage(),
          comment.getSuggestion(),
          comment.getStatus(),
          comment.getDecidedAt(),
          comment.getCreatedAt());
    }
  }
}
