package com.devpath.domain.course.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "lessons")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Lesson {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "lesson_id")
  private Long lessonId;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "section_id", nullable = false)
  private CourseSection section;

  @Column(nullable = false)
  private String title;

  @Column(columnDefinition = "TEXT")
  private String description;

  @Enumerated(EnumType.STRING)
  @Column(name = "lesson_type")
  private LessonType lessonType;

  @Column(name = "video_url")
  private String videoUrl;

  @Column(name = "video_asset_key")
  private String videoAssetKey;

  @Column(name = "thumbnail_url")
  private String thumbnailUrl;
  @Column(nullable = false, length = 150)
  private String title;

  @Enumerated(EnumType.STRING)
  @Column(name = "lesson_type", nullable = false, length = 30)
  private LessonType lessonType;

  @Column(name = "lesson_order", nullable = false)
  private Integer sortOrder;

  @Column(nullable = false)
  private Boolean previewable;

  @Column(name = "duration_seconds")
  private Integer durationSeconds;

  @Column(name = "is_preview")
  private Boolean isPreview;

  @Column(name = "is_published")
  private Boolean isPublished;

  @Column(name = "sort_order")
  private Integer sortOrder;

  public void updateInfo(
      String title,
      String description,
      LessonType lessonType,
      String videoUrl,
      String videoAssetKey,
      String thumbnailUrl,
      Integer durationSeconds,
      Boolean isPreview,
      Boolean isPublished) {
    this.title = title;
    this.description = description;
    this.lessonType = lessonType;
    this.videoUrl = videoUrl;
    this.videoAssetKey = videoAssetKey;
    this.thumbnailUrl = thumbnailUrl;
    this.durationSeconds = durationSeconds;
    this.isPreview = isPreview;
    this.isPublished = isPublished;
  }

  @Column(name = "video_asset_key", length = 255)
  private String videoAssetKey;

  @CreationTimestamp
  @Column(name = "created_at", updatable = false)
  private LocalDateTime createdAt;

  // 레슨의 기본 정보를 수정한다.
  public void updateInfo(
      String title,
      LessonType lessonType,
      String videoAssetKey,
      Integer durationSeconds,
      Boolean previewable) {
    this.title = title;
    this.lessonType = lessonType;
    this.videoAssetKey = videoAssetKey;
    this.durationSeconds = durationSeconds;
    this.previewable = previewable;
  }

  // 레슨의 정렬 순서를 변경한다.
  public void changeSortOrder(Integer sortOrder) {
    this.sortOrder = sortOrder;
  }
}
