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
import org.hibernate.annotations.UpdateTimestamp;

// 강의 공지/새소식 정보를 저장하는 엔티티다.
@Entity
@Table(name = "course_announcements")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class CourseAnnouncement {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "announcement_id")
  private Long announcementId;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "course_id", nullable = false)
  private Course course;

  @Enumerated(EnumType.STRING)
  @Column(name = "announcement_type", nullable = false, length = 30)
  private CourseAnnouncementType type;

  @Column(name = "title", nullable = false, length = 200)
  private String title;

  @Column(name = "content", nullable = false, columnDefinition = "TEXT")
  private String content;

  @Column(name = "is_pinned", nullable = false)
  private Boolean pinned;

  @Column(name = "display_order", nullable = false)
  private Integer displayOrder;

  @Column(name = "published_at")
  private LocalDateTime publishedAt;

  @Column(name = "exposure_start_at")
  private LocalDateTime exposureStartAt;

  @Column(name = "exposure_end_at")
  private LocalDateTime exposureEndAt;

  @Column(name = "event_banner_text", length = 255)
  private String eventBannerText;

  @Column(name = "event_link", length = 500)
  private String eventLink;

  @CreationTimestamp
  @Column(name = "created_at", updatable = false)
  private LocalDateTime createdAt;

  @UpdateTimestamp
  @Column(name = "updated_at")
  private LocalDateTime updatedAt;

  // 공지 기본 정보를 수정한다.
  public void update(
      CourseAnnouncementType type,
      String title,
      String content,
      Boolean pinned,
      Integer displayOrder,
      LocalDateTime publishedAt,
      LocalDateTime exposureStartAt,
      LocalDateTime exposureEndAt,
      String eventBannerText,
      String eventLink) {
    this.type = type;
    this.title = title;
    this.content = content;
    this.pinned = pinned;
    this.displayOrder = displayOrder;
    this.publishedAt = publishedAt;
    this.exposureStartAt = exposureStartAt;
    this.exposureEndAt = exposureEndAt;
    this.eventBannerText = eventBannerText;
    this.eventLink = eventLink;
  }

  // 고정 여부를 변경한다.
  public void changePinned(Boolean pinned) {
    this.pinned = pinned;
  }

  // 노출 순서를 변경한다.
  public void changeDisplayOrder(Integer displayOrder) {
    this.displayOrder = displayOrder;
  }
}
