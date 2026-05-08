package com.devpath.api.analytics.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

public class InstructorAnalyticsDifficultyResponse {

  @Getter
  @Builder
  @Schema(description = "Node difficulty item")
  public static class NodeItem {

    @Schema(description = "Roadmap node id", example = "101")
    private Long nodeId;

    @Schema(description = "Roadmap node title", example = "Spring Security JWT authentication")
    private String nodeTitle;

    @Schema(description = "Difficulty score", example = "63.5")
    private Double difficultyScore;

    @Schema(description = "Difficulty label", example = "HARD")
    private String difficultyLabel;

    @Schema(description = "Quiz pass rate", example = "58.3")
    private Double quizPassRate;

    @Schema(description = "Assignment score rate", example = "71.2")
    private Double assignmentScoreRate;

    @Schema(description = "Drop-off rate", example = "44.8")
    private Double dropOffRate;
  }
}
