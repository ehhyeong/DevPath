package com.devpath.api.analytics.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

public class InstructorAnalyticsDropOffResponse {

  @Getter
  @Builder
  @Schema(description = "Lesson drop-off item")
  public static class LessonItem {

    @Schema(description = "Lesson id", example = "17")
    private Long lessonId;

    @Schema(description = "Lesson title", example = "JWT Authentication Filter implementation")
    private String lessonTitle;

    @Schema(description = "Started learner count", example = "30")
    private Long startedLearnerCount;

    @Schema(description = "Completed learner count", example = "18")
    private Long completedLearnerCount;

    @Schema(description = "Average watch seconds", example = "530")
    private Integer averageWatchSeconds;

    @Schema(description = "Drop-off rate", example = "40.0")
    private Double dropOffRate;
  }
}
