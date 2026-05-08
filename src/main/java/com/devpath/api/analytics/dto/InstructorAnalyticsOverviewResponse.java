package com.devpath.api.analytics.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

public class InstructorAnalyticsOverviewResponse {

  @Getter
  @Builder
  @Schema(description = "Instructor analytics overview response")
  public static class Detail {

    @Schema(description = "Course count", example = "6")
    private Long courseCount;

    @Schema(description = "Published course count", example = "4")
    private Long publishedCourseCount;

    @Schema(description = "Total student count", example = "120")
    private Long totalStudentCount;

    @Schema(description = "Active student count", example = "93")
    private Long activeStudentCount;

    @Schema(description = "Published lesson count", example = "48")
    private Long totalLessonCount;

    @Schema(description = "Completed lesson record count", example = "615")
    private Long completedLessonCount;

    @Schema(description = "Average progress percent", example = "72.5")
    private Double averageProgressPercent;
  }
}
