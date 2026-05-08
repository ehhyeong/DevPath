package com.devpath.api.review.dto;

import com.devpath.domain.review.entity.MissionSubmission;
import com.devpath.domain.review.entity.MissionSubmissionStatus;
import com.devpath.domain.review.entity.PullRequestReview;
import com.devpath.domain.review.entity.PullRequestReviewStatus;
import com.devpath.domain.review.entity.PullRequestSubmission;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import java.util.List;

public class PullRequestReviewResponse {

  private PullRequestReviewResponse() {}

  @Schema(name = "PullRequestSubmissionSummaryResponse", description = "PR 제출 목록 응답")
  public record PullRequestSummary(
      @Schema(description = "PR 제출 ID", example = "1") Long pullRequestId,
      @Schema(description = "미션 제출 ID", example = "1") Long missionSubmissionId,
      @Schema(description = "미션 ID", example = "1") Long missionId,
      @Schema(description = "미션 제목", example = "1주차 Spring Boot REST API 구현") String missionTitle,
      @Schema(description = "제출자 사용자 ID", example = "2") Long submitterId,
      @Schema(description = "제출자 이름", example = "이학습") String submitterName,
      @Schema(description = "PR 제출 제목", example = "1주차 멘토링 공고 CRUD 구현") String title,
      @Schema(description = "GitHub PR URL", example = "https://github.com/yongha03/DevPath/pull/1")
          String prUrl,
      @Schema(description = "미션 제출 상태", example = "SUBMITTED")
          MissionSubmissionStatus submissionStatus,
      @Schema(description = "제출일시", example = "2026-05-03T13:00:00") LocalDateTime createdAt) {

    // 멘토링별 PR 목록 조회에 필요한 최소 정보를 DTO로 변환한다.
    public static PullRequestSummary from(PullRequestSubmission pullRequest) {
      MissionSubmission submission = pullRequest.getMissionSubmission();

      return new PullRequestSummary(
          pullRequest.getId(),
          submission.getId(),
          submission.getMission().getId(),
          submission.getMission().getTitle(),
          submission.getSubmitter().getId(),
          submission.getSubmitter().getName(),
          pullRequest.getTitle(),
          pullRequest.getPrUrl(),
          submission.getStatus(),
          pullRequest.getCreatedAt());
    }
  }

  @Schema(name = "PullRequestSubmissionDetailResponse", description = "PR 제출 상세 응답")
  public record PullRequestDetail(
      @Schema(description = "PR 제출 ID", example = "1") Long pullRequestId,
      @Schema(description = "미션 제출 ID", example = "1") Long missionSubmissionId,
      @Schema(description = "멘토링 ID", example = "1") Long mentoringId,
      @Schema(description = "미션 ID", example = "1") Long missionId,
      @Schema(description = "미션 제목", example = "1주차 Spring Boot REST API 구현") String missionTitle,
      @Schema(description = "제출자 사용자 ID", example = "2") Long submitterId,
      @Schema(description = "제출자 이름", example = "이학습") String submitterName,
      @Schema(description = "PR 제출 제목", example = "1주차 멘토링 공고 CRUD 구현") String title,
      @Schema(description = "PR 설명", example = "멘토링 공고 CRUD와 Soft Delete 처리를 구현했습니다.")
          String description,
      @Schema(description = "GitHub PR URL", example = "https://github.com/yongha03/DevPath/pull/1")
          String prUrl,
      @Schema(description = "미션 제출 상태", example = "SUBMITTED")
          MissionSubmissionStatus submissionStatus,
      @Schema(description = "최종 피드백", example = "요구사항을 충족했습니다.") String feedback,
      @Schema(description = "리뷰 목록", example = "[{\"reviewId\":1,\"status\":\"APPROVED\"}]")
          List<ReviewDetail> reviews,
      @Schema(description = "제출일시", example = "2026-05-03T13:00:00") LocalDateTime createdAt) {

    // PR 단건 조회에서 PR 정보와 리뷰 목록을 함께 반환한다.
    public static PullRequestDetail from(
        PullRequestSubmission pullRequest, List<PullRequestReview> reviews) {
      MissionSubmission submission = pullRequest.getMissionSubmission();

      return new PullRequestDetail(
          pullRequest.getId(),
          submission.getId(),
          submission.getMission().getMentoring().getId(),
          submission.getMission().getId(),
          submission.getMission().getTitle(),
          submission.getSubmitter().getId(),
          submission.getSubmitter().getName(),
          pullRequest.getTitle(),
          pullRequest.getDescription(),
          pullRequest.getPrUrl(),
          submission.getStatus(),
          submission.getFeedback(),
          reviews.stream().map(ReviewDetail::from).toList(),
          pullRequest.getCreatedAt());
    }
  }

  @Schema(name = "PullRequestReviewDetailResponse", description = "PR 코드 리뷰 상세 응답")
  public record ReviewDetail(
      @Schema(description = "리뷰 ID", example = "1") Long reviewId,
      @Schema(description = "PR 제출 ID", example = "1") Long pullRequestId,
      @Schema(description = "리뷰어 사용자 ID", example = "1") Long reviewerId,
      @Schema(description = "리뷰어 이름", example = "김멘토") String reviewerName,
      @Schema(description = "리뷰 코멘트", example = "Controller가 얇게 유지되어 좋습니다.") String comment,
      @Schema(description = "리뷰 상태", example = "APPROVED") PullRequestReviewStatus status,
      @Schema(description = "승인/반려 처리일시", example = "2026-05-03T14:00:00") LocalDateTime decidedAt,
      @Schema(description = "리뷰 작성일시", example = "2026-05-03T13:30:00") LocalDateTime createdAt) {

    // 리뷰 엔티티를 상세 응답 DTO로 변환한다.
    public static ReviewDetail from(PullRequestReview review) {
      return new ReviewDetail(
          review.getId(),
          review.getPullRequestSubmission().getId(),
          review.getReviewer().getId(),
          review.getReviewer().getName(),
          review.getComment(),
          review.getStatus(),
          review.getDecidedAt(),
          review.getCreatedAt());
    }
  }

  @Schema(name = "MissionSubmissionDetailResponse", description = "미션 제출 판정 응답")
  public record MissionSubmissionDetail(
      @Schema(description = "미션 제출 ID", example = "1") Long missionSubmissionId,
      @Schema(description = "미션 ID", example = "1") Long missionId,
      @Schema(description = "미션 제목", example = "1주차 Spring Boot REST API 구현") String missionTitle,
      @Schema(description = "제출자 사용자 ID", example = "2") Long submitterId,
      @Schema(description = "제출자 이름", example = "이학습") String submitterName,
      @Schema(description = "미션 제출 상태", example = "PASSED") MissionSubmissionStatus status,
      @Schema(description = "최종 피드백", example = "요구사항을 충족했습니다.") String feedback,
      @Schema(description = "판정일시", example = "2026-05-03T14:10:00") LocalDateTime gradedAt) {

    // 미션 Pass/Reject 결과를 응답 DTO로 변환한다.
    public static MissionSubmissionDetail from(MissionSubmission submission) {
      return new MissionSubmissionDetail(
          submission.getId(),
          submission.getMission().getId(),
          submission.getMission().getTitle(),
          submission.getSubmitter().getId(),
          submission.getSubmitter().getName(),
          submission.getStatus(),
          submission.getFeedback(),
          submission.getGradedAt());
    }
  }
}
