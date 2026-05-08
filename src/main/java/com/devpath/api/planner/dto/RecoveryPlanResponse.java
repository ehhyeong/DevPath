package com.devpath.api.planner.dto;

import com.devpath.domain.planner.entity.RecoveryPlan;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@Schema(description = "Recovery plan response")
public class RecoveryPlanResponse {

  @Schema(description = "Recovery plan id", example = "1")
  private Long id;

  @Schema(
      description = "Recovery plan details",
      example = "Review for 30 minutes today, practice for 1 hour tomorrow.")
  private String planDetails;

  @Schema(description = "Created at")
  private LocalDateTime createdAt;

  public static RecoveryPlanResponse from(RecoveryPlan recoveryPlan) {
    return RecoveryPlanResponse.builder()
        .id(recoveryPlan.getId())
        .planDetails(recoveryPlan.getPlanDetails())
        .createdAt(recoveryPlan.getCreatedAt())
        .build();
  }
}
