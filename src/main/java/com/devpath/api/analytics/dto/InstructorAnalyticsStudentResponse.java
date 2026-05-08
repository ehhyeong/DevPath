package com.devpath.api.analytics.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

public class InstructorAnalyticsStudentResponse {

  @Getter
  @Builder
  @Schema(description = "Instructor student analytics item")
  public static class StudentItem {

    @Schema(description = "Student id", example = "21")
    private Long studentId;

    @Schema(description = "Student name", example = "Kim Taehyeong")
    private String studentName;

    @Schema(description = "Course id", example = "3")
    private Long courseId;

    @Schema(description = "Course title", example = "Spring Boot authentication advanced")
    private String courseTitle;

    @Schema(description = "Enrollment status", example = "ACTIVE")
    private String enrollmentStatus;

    @Schema(description = "Progress percent", example = "78")
    private Integer progressPercent;

    @Schema(description = "Completed flag", example = "false")
    private Boolean completed;

    @Schema(description = "Enrolled at", example = "2026-03-10T10:00:00")
    private LocalDateTime enrolledAt;

    @Schema(description = "Last accessed at", example = "2026-03-29T09:30:00")
    private LocalDateTime lastAccessedAt;

    @Schema(description = "Completed at", example = "2026-03-28T21:00:00")
    private LocalDateTime completedAt;
  }
}
