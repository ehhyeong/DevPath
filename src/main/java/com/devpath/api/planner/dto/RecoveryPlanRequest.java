package com.devpath.api.planner.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Schema(description = "Recovery plan create request")
public class RecoveryPlanRequest {

  @NotBlank(message = "Recovery plan details are required.")
  @Size(max = 1000, message = "Recovery plan details must be 1000 characters or fewer.")
  @Schema(
      description = "Recovery plan details",
      example = "Review for 30 minutes today, practice for 1 hour tomorrow.")
  private String planDetails;
}
