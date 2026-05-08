package com.devpath.domain.planner.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.*;

@Entity
@Table(name = "weekly_plan")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class WeeklyPlan {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "learner_id", nullable = false)
  private Long learnerId;

  @Column(name = "plan_content", columnDefinition = "TEXT", nullable = false)
  private String planContent;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private WeeklyPlanStatus status;

  @Column(name = "created_at", updatable = false)
  private LocalDateTime createdAt;

  @PrePersist
  protected void onCreate() {
    this.createdAt = LocalDateTime.now();
  }

  // 비즈니스 메서드
  public void updateContent(String planContent) {
    this.planContent = planContent;
  }

  public void adjustPlan(String newContent) {
    this.planContent = newContent;
    this.status = WeeklyPlanStatus.IN_PROGRESS;
  }
}
