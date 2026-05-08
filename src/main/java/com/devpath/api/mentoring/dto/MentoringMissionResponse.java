package com.devpath.api.mentoring.dto;

import com.devpath.domain.mentoring.entity.MentoringMission;
import com.devpath.domain.mentoring.entity.MentoringMissionStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;

public class MentoringMissionResponse {

  private MentoringMissionResponse() {}

  @Schema(name = "MentoringMissionSummaryResponse", description = "멘토링 미션 목록 응답")
  public record Summary(
      @Schema(description = "미션 ID", example = "1") Long missionId,
      @Schema(description = "멘토링 ID", example = "1") Long mentoringId,
      @Schema(description = "주차 번호", example = "1") Integer weekNumber,
      @Schema(description = "미션 제목", example = "1주차 Spring Boot REST API 구현") String title,
      @Schema(description = "미션 상태", example = "OPEN") MentoringMissionStatus status,
      @Schema(description = "마감일시", example = "2026-05-10T23:59:00") LocalDateTime dueAt,
      @Schema(description = "생성일시", example = "2026-05-03T10:00:00") LocalDateTime createdAt) {

    // 목록 조회에서 필요한 최소 필드만 응답 DTO로 변환한다.
    public static Summary from(MentoringMission mission) {
      return new Summary(
          mission.getId(),
          mission.getMentoring().getId(),
          mission.getWeekNumber(),
          mission.getTitle(),
          mission.getStatus(),
          mission.getDueAt(),
          mission.getCreatedAt());
    }
  }

  @Schema(name = "MentoringMissionDetailResponse", description = "멘토링 미션 상세 응답")
  public record Detail(
      @Schema(description = "미션 ID", example = "1") Long missionId,
      @Schema(description = "멘토링 ID", example = "1") Long mentoringId,
      @Schema(description = "멘토링 공고 제목", example = "Spring Boot 포트폴리오 멘토링") String mentoringTitle,
      @Schema(description = "멘토 사용자 ID", example = "1") Long mentorId,
      @Schema(description = "멘토 이름", example = "김멘토") String mentorName,
      @Schema(description = "멘티 사용자 ID", example = "2") Long menteeId,
      @Schema(description = "멘티 이름", example = "이학습") String menteeName,
      @Schema(description = "주차 번호", example = "1") Integer weekNumber,
      @Schema(description = "미션 제목", example = "1주차 Spring Boot REST API 구현") String title,
      @Schema(description = "미션 설명", example = "멘토링 공고 CRUD API를 구현하고 Swagger로 테스트합니다.")
          String description,
      @Schema(description = "미션 상태", example = "OPEN") MentoringMissionStatus status,
      @Schema(description = "마감일시", example = "2026-05-10T23:59:00") LocalDateTime dueAt,
      @Schema(description = "생성일시", example = "2026-05-03T10:00:00") LocalDateTime createdAt,
      @Schema(description = "수정일시", example = "2026-05-03T11:00:00") LocalDateTime updatedAt) {

    // 생성, 수정, 단건 조회에서 필요한 상세 필드를 응답 DTO로 변환한다.
    public static Detail from(MentoringMission mission) {
      return new Detail(
          mission.getId(),
          mission.getMentoring().getId(),
          mission.getMentoring().getPost().getTitle(),
          mission.getMentoring().getMentor().getId(),
          mission.getMentoring().getMentor().getName(),
          mission.getMentoring().getMentee().getId(),
          mission.getMentoring().getMentee().getName(),
          mission.getWeekNumber(),
          mission.getTitle(),
          mission.getDescription(),
          mission.getStatus(),
          mission.getDueAt(),
          mission.getCreatedAt(),
          mission.getUpdatedAt());
    }
  }
}
