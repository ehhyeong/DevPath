package com.devpath.api.analytics.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

public class InstructorAnalyticsProgressResponse {

  @Getter
  @Builder
  @Schema(description = "Course progress item")
  public static class CourseProgressItem {

    @Schema(description = "Course id", example = "3")
    private Long courseId;

    @Schema(description = "Course title", example = "Spring Boot authentication advanced")
    private String courseTitle;

    @Schema(description = "Enrolled student count", example = "35")
    private Long enrolledStudentCount;

    @Schema(description = "Completed student count", example = "18")
    private Long completedStudentCount;

    @Schema(description = "Average progress percent", example = "74.2")
    private Double averageProgressPercent;

    @Schema(description = "Last activity at", example = "2026-03-29T09:30:00")
    private LocalDateTime lastActivityAt;
  }

  @Getter
  @Builder
  @Schema(description = "Completion rate item")
  public static class CompletionRateItem {

    @Schema(description = "Course id", example = "3")
    private Long courseId;

    @Schema(description = "Course title", example = "Spring Boot authentication advanced")
    private String courseTitle;

    @Schema(description = "Enrolled student count", example = "35")
    private Long enrolledStudentCount;

    @Schema(description = "Completed student count", example = "18")
    private Long completedStudentCount;

    @Schema(description = "Completion rate", example = "51.4")
    private Double completionRate;
  }

  @Getter
  @Builder
  @Schema(description = "Average watch time item")
  public static class AverageWatchTimeItem {

    @Schema(description = "Course id", example = "3")
    private Long courseId;

    @Schema(description = "Course title", example = "Spring Boot authentication advanced")
    private String courseTitle;

    @Schema(description = "Average watch seconds", example = "1240")
    private Integer averageWatchSeconds;
  }
}
