package com.devpath.domain.planner.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "learner_goal")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class LearnerGoal {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "learner_id", nullable = false)
  private Long learnerId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private PlannerGoalType goalType;

  @Column(name = "target_value", nullable = false)
  private Integer targetValue;

  @Column(name = "is_active", nullable = false)
  @Builder.Default
  private Boolean isActive = true;

  public void deactivate() {
    this.isActive = false;
  }
}
