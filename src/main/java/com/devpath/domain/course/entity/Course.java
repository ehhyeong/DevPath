package com.devpath.domain.course.entity;

import com.devpath.domain.user.entity.User;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

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

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "instructor_id", nullable = false)
  private User instructor;

  @Column(nullable = false)
  private String title;

  @Column(nullable = false, length = 200)
  private String title;

  @Column(length = 255)
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

  @Column(name = "thumbnail_url", length = 500)
  private String thumbnailUrl;

  @Column(name = "trailer_url", length = 500)
  private String trailerUrl;

  @Column(nullable = false)
  private Integer price;

  @Column(name = "discount_price")
  private Integer discountPrice;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 30)
  private CourseDifficulty difficulty;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 30)
  private CourseStatus status;

  @Builder.Default
  @ElementCollection
  @CollectionTable(name = "course_prerequisites", joinColumns = @JoinColumn(name = "course_id"))
  @Column(name = "content", nullable = false, length = 255)
  private List<String> prerequisites = new ArrayList<>();

  @Builder.Default
  @ElementCollection
  @CollectionTable(name = "course_job_relevance", joinColumns = @JoinColumn(name = "course_id"))
  @Column(name = "content", nullable = false, length = 255)
  private List<String> jobRelevance = new ArrayList<>();

  @CreationTimestamp
  @Column(name = "created_at", updatable = false)
  private LocalDateTime createdAt;

  @UpdateTimestamp
  @Column(name = "updated_at")
  private LocalDateTime updatedAt;

  // 강의의 기본 정보를 수정한다.
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
      Integer price,
      Integer discountPrice,
      CourseDifficulty difficulty) {
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

    this.discountPrice = discountPrice;
    this.difficulty = difficulty;
  }

  // 강의의 상태를 변경한다.
  public void changeStatus(CourseStatus status) {
    this.status = status;
  }

  // 강의의 선수지식을 전체 교체한다.
  public void replacePrerequisites(List<String> prerequisites) {
    this.prerequisites.clear();

    if (prerequisites != null && !prerequisites.isEmpty()) {
      this.prerequisites.addAll(prerequisites);
    }
  }

  public void replaceJobRelevance(List<String> jobRelevance) {
    if (this.jobRelevance == null) {
      this.jobRelevance = new ArrayList<>();
    }

  // 강의의 직무 연관성을 전체 교체한다.
  public void replaceJobRelevance(List<String> jobRelevance) {
    this.jobRelevance.clear();

    if (jobRelevance != null && !jobRelevance.isEmpty()) {
      this.jobRelevance.addAll(jobRelevance);
    }
  }

  // 강의 썸네일 정보를 수정한다.
  public void updateThumbnail(String thumbnailUrl) {
    this.thumbnailUrl = thumbnailUrl;
  }

  public void updateTrailer(String trailerUrl, String videoAssetKey, Integer durationSeconds) {
    this.introVideoUrl = trailerUrl;
    this.videoAssetKey = videoAssetKey;
    this.durationSeconds = durationSeconds;
  // 강의 트레일러 정보를 수정한다.
  public void updateTrailer(String trailerUrl) {
    this.trailerUrl = trailerUrl;
  }
}
