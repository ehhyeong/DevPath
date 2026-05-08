package com.devpath.domain.planner.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import lombok.*;

@Entity
@Table(name = "streak")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class Streak {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "learner_id", nullable = false, unique = true)
  private Long learnerId;

  @Column(name = "current_streak", nullable = false)
  @Builder.Default
  private Integer currentStreak = 0;

  @Column(name = "longest_streak", nullable = false)
  @Builder.Default
  private Integer longestStreak = 0;

  @Column(name = "last_study_date")
  private LocalDate lastStudyDate;

  // 스트릭 갱신 비즈니스 로직
  public void incrementStreak(LocalDate today) {
    if (this.lastStudyDate != null && this.lastStudyDate.equals(today.minusDays(1))) {
      this.currentStreak++;
    } else if (this.lastStudyDate == null || this.lastStudyDate.isBefore(today.minusDays(1))) {
      this.currentStreak = 1; // 끊겼으면 1로 초기화
    }

    if (this.currentStreak > this.longestStreak) {
      this.longestStreak = this.currentStreak;
    }
    this.lastStudyDate = today;
  }
}
