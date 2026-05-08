package com.devpath.api.mentoring.dto;

import com.devpath.domain.mentoring.entity.MentoringMaterial;
import com.devpath.domain.mentoring.entity.MentoringMaterialType;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;

public class MentoringMaterialResponse {

  private MentoringMaterialResponse() {}

  @Schema(name = "MentoringMaterialSummaryResponse", description = "멘토링 미션 자료 목록 응답")
  public record Summary(
      @Schema(description = "자료 ID", example = "1") Long materialId,
      @Schema(description = "미션 ID", example = "1") Long missionId,
      @Schema(description = "자료 타입", example = "URL") MentoringMaterialType type,
      @Schema(description = "자료 제목", example = "1주차 API 설계 가이드") String title,
      @Schema(description = "자료 URL", example = "https://github.com/yongha03/DevPath") String url,
      @Schema(description = "정렬 순서", example = "1") Integer sortOrder,
      @Schema(description = "생성일시", example = "2026-05-03T11:00:00") LocalDateTime createdAt) {

    // 목록 조회에 필요한 최소 필드를 응답 DTO로 변환한다.
    public static Summary from(MentoringMaterial material) {
      return new Summary(
          material.getId(),
          material.getMission().getId(),
          material.getType(),
          material.getTitle(),
          material.getUrl(),
          material.getSortOrder(),
          material.getCreatedAt());
    }
  }

  @Schema(name = "MentoringMaterialDetailResponse", description = "멘토링 미션 자료 상세 응답")
  public record Detail(
      @Schema(description = "자료 ID", example = "1") Long materialId,
      @Schema(description = "미션 ID", example = "1") Long missionId,
      @Schema(description = "멘토링 ID", example = "1") Long mentoringId,
      @Schema(description = "미션 제목", example = "1주차 Spring Boot REST API 구현") String missionTitle,
      @Schema(description = "멘토 사용자 ID", example = "1") Long mentorId,
      @Schema(description = "멘토 이름", example = "김멘토") String mentorName,
      @Schema(description = "자료 타입", example = "TEXT") MentoringMaterialType type,
      @Schema(description = "자료 제목", example = "1주차 코드 리뷰 체크리스트") String title,
      @Schema(
              description = "텍스트 가이드라인 본문",
              example = "Controller는 Service 호출과 ApiResponse 반환만 담당합니다.")
          String content,
      @Schema(description = "자료 URL", example = "https://github.com/yongha03/DevPath") String url,
      @Schema(description = "정렬 순서", example = "1") Integer sortOrder,
      @Schema(description = "생성일시", example = "2026-05-03T11:00:00") LocalDateTime createdAt,
      @Schema(description = "수정일시", example = "2026-05-03T12:00:00") LocalDateTime updatedAt) {

    // 생성, 수정, 상세 조회에서 필요한 전체 정보를 응답 DTO로 변환한다.
    public static Detail from(MentoringMaterial material) {
      return new Detail(
          material.getId(),
          material.getMission().getId(),
          material.getMission().getMentoring().getId(),
          material.getMission().getTitle(),
          material.getMission().getMentoring().getMentor().getId(),
          material.getMission().getMentoring().getMentor().getName(),
          material.getType(),
          material.getTitle(),
          material.getContent(),
          material.getUrl(),
          material.getSortOrder(),
          material.getCreatedAt(),
          material.getUpdatedAt());
    }
  }
}
