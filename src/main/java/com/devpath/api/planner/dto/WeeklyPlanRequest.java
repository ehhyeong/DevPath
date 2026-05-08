package com.devpath.api.planner.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Schema(description = "주간 플랜 생성/수정 요청 DTO")
public class WeeklyPlanRequest {
  @NotBlank(message = "플랜 내용은 필수입니다.")
  @Schema(description = "이번 주 학습 계획 내용", example = "Spring Boot 기초 완강 및 과제 제출")
  private String planContent;
}
