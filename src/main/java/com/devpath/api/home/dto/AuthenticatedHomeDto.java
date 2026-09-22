package com.devpath.api.home.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import lombok.Builder;
import lombok.Getter;

public class AuthenticatedHomeDto {

  @Getter
  @Builder
  public static class DashboardResponse {
    private LearningStatus currentLearning;
    private List<ProjectSummary> participatingProjects;
    private List<RecentCourse> recentCourses;
    private List<CourseCategory> topCourseCategories;
  }

  @Getter
  @Builder
  public static class LearningStatus {
    private Long courseId;
    private Long lessonId;
    private String courseTitle;
    private String lessonTitle;
    private Integer progressPercentage;
    private String href;
    private LocalDateTime lastWatchedAt;
  }

  @Getter
  @Builder
  public static class ProjectSummary {
    private Long projectId;
    private String typeLabel;
    private String title;
    private String description;
    private Integer progressPercentage;
    private String href;
  }

  @Getter
  @Builder
  public static class RecentCourse {
    private Long courseId;
    private String title;
    private String thumbnailUrl;
    private Integer progressPercentage;
    private String href;
    private LocalDateTime lastWatchedAt;
  }

  @Getter
  @Builder
  public static class CourseCategory {
    private String key;
    private String label;
    private List<TopCourse> courses;
  }

  @Getter
  @Builder
  public static class TopCourse {
    private Long courseId;
    private String title;
    private String thumbnailUrl;
    private String categoryLabel;
    private Double averageRating;
    private Long enrollmentCount;
    private BigDecimal price;
    private String currency;
    private String href;
  }
}
