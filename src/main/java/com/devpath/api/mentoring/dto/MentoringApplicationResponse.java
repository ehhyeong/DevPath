package com.devpath.api.mentoring.dto;

import com.devpath.domain.mentoring.entity.MentoringApplication;
import com.devpath.domain.mentoring.entity.MentoringApplicationStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;

public class MentoringApplicationResponse {

  private MentoringApplicationResponse() {}

  @Schema(name = "MentoringApplicationSummaryResponse", description = "멘토링 신청 목록 응답")
  public record Summary(
      @Schema(description = "멘토링 신청 ID", example = "1") Long applicationId,
      @Schema(description = "멘토링 공고 ID", example = "1") Long postId,
      @Schema(description = "멘토링 공고 제목", example = "Spring Boot 포트폴리오 멘토링") String postTitle,
      @Schema(description = "멘토 사용자 ID", example = "1") Long mentorId,
      @Schema(description = "멘토 이름", example = "김멘토") String mentorName,
      @Schema(description = "신청자 사용자 ID", example = "2") Long applicantId,
      @Schema(description = "신청자 이름", example = "이학습") String applicantName,
      @Schema(description = "신청 상태", example = "PENDING") MentoringApplicationStatus status,
      @Schema(description = "신청일시", example = "2026-05-02T11:10:00") LocalDateTime createdAt) {

    // 목록 화면에 필요한 신청 요약 정보를 DTO로 변환한다.
    public static Summary from(MentoringApplication application) {
      return new Summary(
          application.getId(),
          application.getPost().getId(),
          application.getPost().getTitle(),
          application.getPost().getMentor().getId(),
          application.getPost().getMentor().getName(),
          application.getApplicant().getId(),
          application.getApplicant().getName(),
          application.getStatus(),
          application.getCreatedAt());
    }
  }

  @Schema(name = "MentoringApplicationDetailResponse", description = "멘토링 신청 상세 응답")
  public record Detail(
      @Schema(description = "멘토링 신청 ID", example = "1") Long applicationId,
      @Schema(description = "승인 시 생성된 멘토링 ID", example = "1") Long mentoringId,
      @Schema(description = "멘토링 공고 ID", example = "1") Long postId,
      @Schema(description = "멘토링 공고 제목", example = "Spring Boot 포트폴리오 멘토링") String postTitle,
      @Schema(description = "멘토 사용자 ID", example = "1") Long mentorId,
      @Schema(description = "멘토 이름", example = "김멘토") String mentorName,
      @Schema(description = "신청자 사용자 ID", example = "2") Long applicantId,
      @Schema(description = "신청자 이름", example = "이학습") String applicantName,
      @Schema(description = "신청 메시지", example = "Spring Boot 포트폴리오 리뷰를 받고 싶습니다.") String message,
      @Schema(description = "신청 상태", example = "APPROVED") MentoringApplicationStatus status,
      @Schema(description = "거절 사유", example = "이번 기수 모집 인원이 마감되었습니다.") String rejectReason,
      @Schema(description = "처리일시", example = "2026-05-02T12:00:00") LocalDateTime processedAt,
      @Schema(description = "신청일시", example = "2026-05-02T11:10:00") LocalDateTime createdAt) {

    // 승인 전 또는 거절 응답처럼 멘토링 ID가 없는 경우 사용한다.
    public static Detail from(MentoringApplication application) {
      return from(application, null);
    }

    // 승인 응답처럼 생성된 멘토링 ID를 함께 내려야 할 때 사용한다.
    public static Detail from(MentoringApplication application, Long mentoringId) {
      return new Detail(
          application.getId(),
          mentoringId,
          application.getPost().getId(),
          application.getPost().getTitle(),
          application.getPost().getMentor().getId(),
          application.getPost().getMentor().getName(),
          application.getApplicant().getId(),
          application.getApplicant().getName(),
          application.getMessage(),
          application.getStatus(),
          application.getRejectReason(),
          application.getProcessedAt(),
          application.getCreatedAt());
    }
  }

  @Schema(name = "MentoringApplicationStatusResponse", description = "멘토링 신청 상태 응답")
  public record Status(
      @Schema(description = "멘토링 신청 ID", example = "1") Long applicationId,
      @Schema(description = "신청 상태", example = "PENDING") MentoringApplicationStatus status,
      @Schema(description = "거절 사유", example = "이번 기수 모집 인원이 마감되었습니다.") String rejectReason,
      @Schema(description = "처리일시", example = "2026-05-02T12:00:00") LocalDateTime processedAt) {

    // 상태 추적 API에 필요한 필드만 응답한다.
    public static Status from(MentoringApplication application) {
      return new Status(
          application.getId(),
          application.getStatus(),
          application.getRejectReason(),
          application.getProcessedAt());
    }
  }
}
