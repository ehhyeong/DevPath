package com.devpath.api.mentoring.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;

public class MentoringMissionRequest {

  private MentoringMissionRequest() {}

  @Schema(name = "MentoringMissionCreateRequest", description = "멘토링 미션 생성 요청")
  public record Create(

      @Schema(hidden = true) Long mentorId,

      // 멘토링 안에서 몇 주차 미션인지 나타낸다.
      @Schema(description = "주차 번호", example = "1")
          @NotNull(message = "주차 번호는 필수입니다.")
          @Min(value = 1, message = "주차 번호는 1 이상이어야 합니다.")
          Integer weekNumber,

      // 미션 목록과 상세 화면에 표시되는 제목이다.
      @Schema(description = "미션 제목", example = "1주차 Spring Boot REST API 구현")
          @NotBlank(message = "미션 제목은 필수입니다.")
          @Size(max = 150, message = "미션 제목은 150자 이하여야 합니다.")
          String title,

      // 미션 요구사항과 제출 기준을 설명한다.
      @Schema(description = "미션 설명", example = "멘토링 공고 CRUD API를 구현하고 Swagger로 테스트합니다.")
          @NotBlank(message = "미션 설명은 필수입니다.")
          String description,

      // 미션 제출 권장 마감일이다.
      @Schema(description = "마감일시", example = "2026-05-10T23:59:00") LocalDateTime dueAt) {}

  @Schema(name = "MentoringMissionUpdateRequest", description = "멘토링 미션 수정 요청")
  public record Update(

      @Schema(hidden = true) Long mentorId,

      // 수정 후에도 같은 멘토링 내 주차 중복은 허용하지 않는다.
      @Schema(description = "주차 번호", example = "2")
          @NotNull(message = "주차 번호는 필수입니다.")
          @Min(value = 1, message = "주차 번호는 1 이상이어야 합니다.")
          Integer weekNumber,

      // 수정 시 빈 제목 저장을 막는다.
      @Schema(description = "미션 제목", example = "2주차 JPA 연관관계 설계")
          @NotBlank(message = "미션 제목은 필수입니다.")
          @Size(max = 150, message = "미션 제목은 150자 이하여야 합니다.")
          String title,

      // 수정 시 빈 설명 저장을 막는다.
      @Schema(description = "미션 설명", example = "멘토링 신청 승인 흐름과 JPA 연관관계를 개선합니다.")
          @NotBlank(message = "미션 설명은 필수입니다.")
          String description,

      // 수정된 제출 권장 마감일이다.
      @Schema(description = "마감일시", example = "2026-05-17T23:59:00") LocalDateTime dueAt) {}
}
