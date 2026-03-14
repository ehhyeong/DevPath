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
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

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
  private String videoId;

  @Column(name = "video_provider")
  private String videoProvider;

  @Column(name = "thumbnail_url")
  private String thumbnailUrl;

  @Column(name = "duration_seconds")
  private Integer durationSeconds;

  @Column(name = "is_preview")
  private Boolean isPreview;

  @Column(name = "is_published")
  private Boolean isPublished;

  @Column(name = "sort_order")
  private Integer orderIndex;

  public void updateInfo(
      String title,
      String description,
      LessonType lessonType,
      String videoId,
      String videoUrl,
      String videoProvider,
      String thumbnailUrl,
      Integer durationSeconds,
      Boolean isPreview,
      Boolean isPublished) {
    this.title = title;
    this.description = description;
    this.lessonType = lessonType;
    this.videoId = videoId;
    this.videoUrl = videoUrl;
    this.videoProvider = videoProvider;
    this.thumbnailUrl = thumbnailUrl;
    this.durationSeconds = durationSeconds;
    this.isPreview = isPreview;
    this.isPublished = isPublished;
  }

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
    this.videoId = videoAssetKey;
    this.videoProvider = null;
    this.thumbnailUrl = thumbnailUrl;
    this.durationSeconds = durationSeconds;
    this.isPreview = isPreview;
    this.isPublished = isPublished;
  }

  public void changeSortOrder(Integer sortOrder) {
    this.orderIndex = sortOrder;
  }

  public void changeOrderIndex(Integer orderIndex) {
    this.orderIndex = orderIndex;
  }
}
