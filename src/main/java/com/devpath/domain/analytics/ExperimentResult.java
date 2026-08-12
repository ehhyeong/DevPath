package com.devpath.domain.analytics;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

@Entity
@Table(name = "experiment_results")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class ExperimentResult {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "experiment_id", nullable = false, length = 100)
  private String experimentId;

  @Column(name = "experiment_name", nullable = false)
  private String experimentName;

  @Column(columnDefinition = "TEXT")
  private String hypothesis;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private ExperimentStatus status;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(columnDefinition = "JSON", nullable = false)
  private String metricsJson;

  @CreatedDate
  @Column(name = "created_at", updatable = false)
  private LocalDateTime createdAt;

  @LastModifiedDate private LocalDateTime updatedAt;

  private LocalDateTime startedAt;

  private LocalDateTime completedAt;

  @Builder
  public ExperimentResult(
      String experimentId,
      String experimentName,
      String hypothesis,
      String metricsJson,
      ExperimentStatus status) {
    this.experimentId = experimentId;
    this.experimentName = experimentName;
    this.hypothesis = hypothesis;
    this.metricsJson = metricsJson == null ? "{}" : metricsJson;
    this.status = status == null ? ExperimentStatus.COMPLETED : status;
  }

  public void start() {
    this.status = ExperimentStatus.RUNNING;
    if (this.startedAt == null) {
      this.startedAt = LocalDateTime.now();
    }
  }

  public void pause() {
    this.status = ExperimentStatus.PAUSED;
  }

  public void complete() {
    this.status = ExperimentStatus.COMPLETED;
    this.completedAt = LocalDateTime.now();
  }

  public void saveMetrics(String metricsJson) {
    this.metricsJson = metricsJson;
  }
}
