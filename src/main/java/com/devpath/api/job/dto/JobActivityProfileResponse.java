package com.devpath.api.job.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

public class JobActivityProfileResponse {

  private JobActivityProfileResponse() {}

  @Schema(name = "JobActivityProfileResponse", description = "DevPath internal activity skill profile")
  public record Summary(
      @Schema(description = "Number of internal squad/project activities", example = "3")
          int projectCount,
      @Schema(description = "Number of completed assigned kanban tasks", example = "7")
          int completedTaskCount,
      @Schema(description = "Number of issued proof cards", example = "5") int proofCardCount,
      @Schema(description = "Average Proof Card score", example = "92.5")
          double averageProofCardScore,
      @Schema(description = "Skill signals extracted from internal DevPath activity")
          List<String> skillSignals) {}
}
