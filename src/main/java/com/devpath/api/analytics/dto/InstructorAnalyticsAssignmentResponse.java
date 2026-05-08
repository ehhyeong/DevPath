package com.devpath.api.analytics.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.Builder;
import lombok.Getter;

public class InstructorAnalyticsAssignmentResponse {

  @Getter
  @Builder
  @Schema(description = "Assignment analytics summary")
  public static class Summary {

    @Schema(description = "Total submissions", example = "84")
    private Long totalSubmissions;

    @Schema(description = "Graded submissions", example = "71")
    private Long gradedSubmissions;

    @Schema(description = "Average score", example = "82.4")
    private Double averageScore;

    @Schema(description = "Pass rate", example = "76.2")
    private Double passRate;
  }

  @Getter
  @Builder
  @Schema(description = "Node assignment analytics item")
  public static class NodeAssignmentItem {

    @Schema(description = "Roadmap node id", example = "101")
    private Long nodeId;

    @Schema(description = "Roadmap node title", example = "Spring Security JWT authentication")
    private String nodeTitle;

    @Schema(description = "Submission count", example = "19")
    private Long submissionCount;

    @Schema(description = "Graded count", example = "15")
    private Long gradedCount;

    @Schema(description = "Average score", example = "84.1")
    private Double averageScore;
  }

  @Getter
  @Builder
  @Schema(description = "Assignment analytics detail")
  public static class Detail {

    @Schema(description = "Summary")
    private Summary summary;

    @Schema(description = "Node assignment items")
    private List<NodeAssignmentItem> items;
  }
}
