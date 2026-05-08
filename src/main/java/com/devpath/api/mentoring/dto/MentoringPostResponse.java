package com.devpath.api.mentoring.dto;

import com.devpath.domain.mentoring.entity.MentoringPost;
import com.devpath.domain.mentoring.entity.MentoringPostStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;

public class MentoringPostResponse {

  private MentoringPostResponse() {}

  @Schema(name = "MentoringPostSummaryResponse", description = "멘토링 공고 목록 응답")
  public record Summary(
      @Schema(description = "멘토링 공고 ID", example = "1") Long postId,
      @Schema(description = "멘토 사용자 ID", example = "1") Long mentorId,
      @Schema(description = "멘토 이름", example = "김멘토") String mentorName,
      @Schema(description = "멘토링 공고 제목", example = "Spring Boot 포트폴리오 멘토링") String title,
      @Schema(description = "필요 기술 스택", example = "Java, Spring Boot, JPA") String requiredStacks,
      @Schema(description = "최대 참여 인원", example = "5") Integer maxParticipants,
      @Schema(description = "공고 상태", example = "OPEN") MentoringPostStatus status,
      @Schema(description = "생성일시", example = "2026-05-02T11:00:00") LocalDateTime createdAt) {

    // 목록 조회에 필요한 최소 필드만 응답 DTO로 변환한다.
    public static Summary from(MentoringPost post) {
      return new Summary(
          post.getId(),
          post.getMentor().getId(),
          post.getMentor().getName(),
          post.getTitle(),
          post.getRequiredStacks(),
          post.getMaxParticipants(),
          post.getStatus(),
          post.getCreatedAt());
    }
  }

  @Schema(name = "MentoringPostDetailResponse", description = "멘토링 공고 상세 응답")
  public record Detail(
      @Schema(description = "멘토링 공고 ID", example = "1") Long postId,
      @Schema(description = "멘토 사용자 ID", example = "1") Long mentorId,
      @Schema(description = "멘토 이름", example = "김멘토") String mentorName,
      @Schema(description = "멘토링 공고 제목", example = "Spring Boot 포트폴리오 멘토링") String title,
      @Schema(description = "멘토링 공고 내용", example = "Spring Boot 기반 포트폴리오 프로젝트를 코드 리뷰 중심으로 멘토링합니다.")
          String content,
      @Schema(description = "필요 기술 스택", example = "Java, Spring Boot, JPA") String requiredStacks,
      @Schema(description = "최대 참여 인원", example = "5") Integer maxParticipants,
      @Schema(description = "공고 상태", example = "OPEN") MentoringPostStatus status,
      @Schema(description = "생성일시", example = "2026-05-02T11:00:00") LocalDateTime createdAt,
      @Schema(description = "수정일시", example = "2026-05-02T12:00:00") LocalDateTime updatedAt) {

    // 생성, 수정, 단건 조회에서 필요한 상세 필드를 응답 DTO로 변환한다.
    public static Detail from(MentoringPost post) {
      return new Detail(
          post.getId(),
          post.getMentor().getId(),
          post.getMentor().getName(),
          post.getTitle(),
          post.getContent(),
          post.getRequiredStacks(),
          post.getMaxParticipants(),
          post.getStatus(),
          post.getCreatedAt(),
          post.getUpdatedAt());
    }
  }
}
