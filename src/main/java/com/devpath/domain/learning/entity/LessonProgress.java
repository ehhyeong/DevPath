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
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(
    name = "lesson_progress",
    uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "lesson_id"}))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class LessonProgress {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "progress_id")
  private Long id;

  // 진도율을 기록하는 학습자와의 연관관계다.
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "user_id", nullable = false)
  private User user;

  // 진도율이 기록되는 강의 레슨과의 연관관계다.
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "lesson_id", nullable = false)
  private Lesson lesson;

  // 전체 영상 대비 현재까지 시청한 비율(0~100)을 저장한다.
  @Column(name = "progress_percent", nullable = false)
  private Integer progressPercent = 0;

  // 현재 재생 위치를 초 단위로 저장하며 이어보기 시 시작 지점으로 활용된다.
  @Column(name = "progress_seconds", nullable = false)
  private Integer progressSeconds = 0;

  // 학습자가 마지막으로 설정한 재생 속도를 저장하며 플레이어 초기 로딩에 사용된다.
  @Column(name = "default_playback_rate", nullable = false)
  private Double defaultPlaybackRate = 1.0;

  @Column(name = "is_pip_enabled", nullable = false, columnDefinition = "boolean default false")
  private Boolean pipEnabled = false;

  // 강의를 100% 완료했는지 여부를 나타내는 플래그다.
  @Column(name = "is_completed", nullable = false)
  private Boolean isCompleted = false;

  // 학습자가 해당 레슨을 마지막으로 시청한 일시를 저장한다.
  @Column(name = "last_watched_at")
  private LocalDateTime lastWatchedAt;

  // 생성 시각을 자동 저장한다.
  @CreationTimestamp
  @Column(name = "created_at", updatable = false)
  private LocalDateTime createdAt;

  // 수정 시각을 자동 갱신한다.
  @UpdateTimestamp
  @Column(name = "updated_at")
  private LocalDateTime updatedAt;

  @Builder
  public LessonProgress(User user, Lesson lesson) {
    this.user = user;
    this.lesson = lesson;
    this.progressPercent = 0;
    this.progressSeconds = 0;
    this.defaultPlaybackRate = 1.0;
    this.pipEnabled = false;
    this.isCompleted = false;
    this.lastWatchedAt = LocalDateTime.now();
  }

  // 진도율과 재생 위치를 함께 갱신하고 마지막 시청 시각을 현재 시각으로 업데이트한다.
  public void updateProgress(Integer progressPercent, Integer progressSeconds) {
    this.progressPercent = progressPercent;
    this.progressSeconds = progressSeconds;
    this.lastWatchedAt = LocalDateTime.now();
    if (progressPercent >= 100) {
      this.isCompleted = true;
    }
  }

  // 학습자가 선택한 재생 속도를 저장한다.
  public void updatePlaybackRate(Double defaultPlaybackRate) {
    this.defaultPlaybackRate = defaultPlaybackRate;
  }

  public void updatePipMode(Boolean pipEnabled) {
    this.pipEnabled = pipEnabled == null ? false : pipEnabled;
  }
}
