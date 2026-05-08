package com.devpath.api.planner.dto;

import com.devpath.domain.planner.entity.PlannerGoalType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Schema(description = "학습 플래너 목표 설정 요청 DTO")
public class PlannerGoalRequest {

  @NotNull(message = "목표 타입은 필수입니다.")
  @Schema(description = "목표 타입", example = "WEEKLY_NODE_CLEAR")
  private PlannerGoalType goalType;

  @NotNull(message = "목표 수치는 필수입니다.")
  @Min(value = 1, message = "목표 수치는 1 이상이어야 합니다.")
  @Schema(description = "목표 수치 (예: 노드 3개 클리어, 10시간 학습 등)", example = "3")
  private Integer targetValue;
}
