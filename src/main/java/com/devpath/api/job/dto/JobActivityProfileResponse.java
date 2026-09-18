package com.devpath.api.job.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

public class JobActivityProfileResponse {

  private JobActivityProfileResponse() {}

  @Schema(
      name = "JobActivityProfileResponse",
      description = "DevPath internal activity skill profile")
  public record Summary(
      @Schema(description = "Number of internal squad/project activities", example = "3")
          int projectCount,
      @Schema(description = "Number of completed assigned kanban tasks", example = "7")
          int completedTaskCount,
      @Schema(description = "Number of issued proof cards", example = "5") int proofCardCount,
      @Schema(
              description =
                  "Average quiz/assignment grade of cleared nodes (null if no graded data)",
              example = "92.5")
          Double averageProofCardScore,
      @Schema(description = "Skill signals extracted from internal DevPath activity")
          List<String> skillSignals,
      @Schema(description = "Skill signals with the evidence each one was extracted from")
          List<SkillKeywordDetail> skillKeywords) {}

  @Schema(
      name = "JobActivityProfileSkillKeyword",
      description = "Skill signal with its extraction evidence")
  public record SkillKeywordDetail(
      @Schema(description = "Skill keyword", example = "Spring Boot") String name,
      @Schema(description = "Whether a proof card verified this skill", example = "true")
          boolean verified,
      @Schema(description = "Number of issued proof cards carrying this skill", example = "2")
          int proofCardCount,
      @Schema(
              description = "Average quiz/assignment grade behind this skill (null if no data)",
              example = "92")
          Integer scorePercent,
      @Schema(
              description = "Primary evidence source: PROOF_CARD, PROJECT or TASK",
              example = "PROOF_CARD")
          String source) {}
}
