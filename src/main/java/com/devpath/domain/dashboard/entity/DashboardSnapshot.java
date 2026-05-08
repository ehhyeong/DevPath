package com.devpath.domain.dashboard.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import lombok.*;

@Entity
@Table(name = "dashboard_snapshot")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class DashboardSnapshot {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "learner_id", nullable = false)
  private Long learnerId;

  @Column(name = "total_study_hours", nullable = false)
  private Integer totalStudyHours;

  @Column(name = "completed_nodes", nullable = false)
  private Integer completedNodes;

  @Column(name = "snapshot_date", nullable = false)
  private LocalDate snapshotDate;
}
