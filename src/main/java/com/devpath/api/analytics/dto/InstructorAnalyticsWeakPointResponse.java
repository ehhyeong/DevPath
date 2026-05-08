package com.devpath.api.analytics.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

public class InstructorAnalyticsWeakPointResponse {

  @Getter
  @Builder
  @Schema(description = "Node weak point item")
  public static class NodeItem {

    @Schema(description = "Roadmap node id", example = "101")
    private Long nodeId;

    @Schema(description = "Roadmap node title", example = "Spring Security JWT authentication")
    private String nodeTitle;

    @Schema(description = "Weakness score", example = "71.2")
    private Double weaknessScore;

    @Schema(
        description = "Weakness summary",
        example =
            "Low quiz pass rate, low assignment score rate, and high drop-off rate are concentrated here.")
    private String summary;
  }
}
