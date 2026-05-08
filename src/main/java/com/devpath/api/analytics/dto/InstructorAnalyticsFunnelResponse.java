package com.devpath.api.analytics.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.Builder;
import lombok.Getter;

public class InstructorAnalyticsFunnelResponse {

  @Getter
  @Builder
  @Schema(description = "Funnel step item")
  public static class StepItem {

    @Schema(description = "Step name", example = "ENROLLED")
    private String stepName;

    @Schema(description = "Step value", example = "120")
    private Long value;
  }

  @Getter
  @Builder
  @Schema(description = "Funnel detail")
  public static class Detail {

    @Schema(description = "Funnel steps")
    private List<StepItem> steps;
  }
}
