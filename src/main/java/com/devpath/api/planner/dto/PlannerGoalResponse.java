package com.devpath.api.planner.dto;

import com.devpath.domain.planner.entity.LearnerGoal;
import com.devpath.domain.planner.entity.PlannerGoalType;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@Schema(description = "학습 플래너 목표 응답 DTO")
public class PlannerGoalResponse {
  @Schema(description = "목표 ID", example = "1")
  private Long id;

  @Schema(description = "목표 타입", example = "WEEKLY_NODE_CLEAR")
  private PlannerGoalType goalType;

  @Schema(description = "목표 수치", example = "3")
  private Integer targetValue;

  public static PlannerGoalResponse from(LearnerGoal goal) {
    return PlannerGoalResponse.builder()
        .id(goal.getId())
        .goalType(goal.getGoalType())
        .targetValue(goal.getTargetValue())
        .build();
  }
}
