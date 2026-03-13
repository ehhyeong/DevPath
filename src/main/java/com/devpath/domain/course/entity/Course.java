package com.devpath.domain.course.entity;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "courses")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Course {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "course_id")
  private Long courseId;

  @Column(name = "instructor_id", nullable = false)
  private Long instructorId;

  @Column(nullable = false)
  private String title;

  private String subtitle;

  @Column(columnDefinition = "TEXT")
  private String description;

  @Column(precision = 10, scale = 2)
  private BigDecimal price;

  @Column(name = "original_price", precision = 10, scale = 2)
  private BigDecimal originalPrice;

  private String currency;

  @Enumerated(EnumType.STRING)
  @Column(name = "difficulty_level")
  private CourseDifficultyLevel difficultyLevel;

  private String language;

  @Column(name = "has_certificate")
  private Boolean hasCertificate;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  @Builder.Default
  private CourseStatus status = CourseStatus.DRAFT;

  @Column(name = "published_at")
  private LocalDateTime publishedAt;

  @Column(name = "thumbnail_url")
  private String thumbnailUrl;

  @Column(name = "intro_video_url")
  private String introVideoUrl;

  @Column(name = "video_asset_key")
  private String videoAssetKey;

  @Column(name = "duration_seconds")
  private Integer durationSeconds;

  @ElementCollection
  @CollectionTable(name = "course_prerequisites", joinColumns = @JoinColumn(name = "course_id"))
  @Column(name = "prerequisite")
  @Builder.Default
  private List<String> prerequisites = new ArrayList<>();

  @ElementCollection
  @CollectionTable(name = "course_job_relevance", joinColumns = @JoinColumn(name = "course_id"))
  @Column(name = "job_relevance")
  @Builder.Default
  private List<String> jobRelevance = new ArrayList<>();

  @PrePersist
  protected void onCreate() {
    if (this.status == null) {
      this.status = CourseStatus.DRAFT;
    }
  }

  public void updateBasicInfo(
      String title,
      String subtitle,
      String description,
      BigDecimal price,
      BigDecimal originalPrice,
      String currency,
      CourseDifficultyLevel difficultyLevel,
      String language,
      Boolean hasCertificate) {
    this.title = title;
    this.subtitle = subtitle;
    this.description = description;
    this.price = price;
    this.originalPrice = originalPrice;
    this.currency = currency;
    this.difficultyLevel = difficultyLevel;
    this.language = language;
    this.hasCertificate = hasCertificate;
  }

  public void changeStatus(CourseStatus status) {
    this.status = status;

    if (status == CourseStatus.PUBLISHED && this.publishedAt == null) {
      this.publishedAt = LocalDateTime.now();
    }
  }

  public void replacePrerequisites(List<String> prerequisites) {
    if (this.prerequisites == null) {
      this.prerequisites = new ArrayList<>();
    }

    this.prerequisites.clear();

    if (prerequisites != null && !prerequisites.isEmpty()) {
      this.prerequisites.addAll(prerequisites);
    }
  }

  public void replaceJobRelevance(List<String> jobRelevance) {
    if (this.jobRelevance == null) {
      this.jobRelevance = new ArrayList<>();
    }

    this.jobRelevance.clear();

    if (jobRelevance != null && !jobRelevance.isEmpty()) {
      this.jobRelevance.addAll(jobRelevance);
    }
  }

  public void updateThumbnail(String thumbnailUrl) {
    this.thumbnailUrl = thumbnailUrl;
  }

  public void updateTrailer(String trailerUrl, String videoAssetKey, Integer durationSeconds) {
    this.introVideoUrl = trailerUrl;
    this.videoAssetKey = videoAssetKey;
    this.durationSeconds = durationSeconds;
  }
}
