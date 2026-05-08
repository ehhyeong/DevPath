package com.devpath.domain.learning.entity;

import com.devpath.domain.course.entity.Lesson;
import com.devpath.domain.user.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(name = "timestamp_notes")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TimestampNote {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "note_id")
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "user_id", nullable = false)
  private User user;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "lesson_id", nullable = false)
  private Lesson lesson;

  @Column(name = "timestamp_second", nullable = false)
  private Integer timestampSecond;

  @Column(columnDefinition = "TEXT", nullable = false)
  private String content;

  @Column(name = "is_deleted", nullable = false)
  private Boolean isDeleted = false;

  @CreationTimestamp
  @Column(name = "created_at", updatable = false)
  private LocalDateTime createdAt;

  @UpdateTimestamp
  @Column(name = "updated_at")
  private LocalDateTime updatedAt;

  @Builder
  public TimestampNote(User user, Lesson lesson, Integer timestampSecond, String content) {
    this.user = user;
    this.lesson = lesson;
    this.timestampSecond = normalizeTimestampSecond(timestampSecond);
    this.content = content;
    this.isDeleted = false;
  }

  public void updateContent(Integer timestampSecond, String content) {
    this.timestampSecond = normalizeTimestampSecond(timestampSecond);
    this.content = content;
  }

  public void delete() {
    this.isDeleted = true;
  }

  private Integer normalizeTimestampSecond(Integer timestampSecond) {
    if (timestampSecond == null || timestampSecond < 0) {
      return 0;
    }
    return timestampSecond;
  }
}
