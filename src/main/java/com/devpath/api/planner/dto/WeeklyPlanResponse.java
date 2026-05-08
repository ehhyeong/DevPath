package com.devpath.api.planner.dto;

import com.devpath.domain.planner.entity.WeeklyPlan;
import com.devpath.domain.planner.entity.WeeklyPlanStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@Schema(description = "주간 플랜 응답 DTO")
public class WeeklyPlanResponse {
  @Schema(description = "플랜 ID", example = "1")
  private Long id;

  @Schema(description = "플랜 내용", example = "Spring Boot 기초 완강 및 과제 제출")
  private String planContent;

  @Schema(description = "진행 상태", example = "PLANNED")
  private WeeklyPlanStatus status;

  @Schema(description = "생성 일시")
  private LocalDateTime createdAt;

  public static WeeklyPlanResponse from(WeeklyPlan plan) {
    return WeeklyPlanResponse.builder()
        .id(plan.getId())
        .planContent(plan.getPlanContent())
        .status(plan.getStatus())
        .createdAt(plan.getCreatedAt())
        .build();
  }
}
