package com.devpath.domain.learning.entity.analytics;

import com.devpath.domain.course.entity.Course;
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
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "learning_metric_samples")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class LearningMetricSample {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "learning_metric_sample_id")
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "course_id")
  private Course course;

  @Enumerated(EnumType.STRING)
  @Column(name = "metric_type", nullable = false, length = 50)
  private AnalyticsMetricType metricType;

  @Column(name = "metric_label", nullable = false, length = 100)
  private String metricLabel;

  @Column(name = "metric_value", nullable = false)
  private Double metricValue;

  @Column(name = "sampled_at", nullable = false)
  private LocalDateTime sampledAt;

  @CreationTimestamp
  @Column(name = "created_at", updatable = false)
  private LocalDateTime createdAt;

  @Builder
  public LearningMetricSample(
      Course course,
      AnalyticsMetricType metricType,
      String metricLabel,
      Double metricValue,
      LocalDateTime sampledAt) {
    this.course = course;
    this.metricType = metricType;
    this.metricLabel = metricLabel;
    this.metricValue = metricValue;
    this.sampledAt = sampledAt == null ? LocalDateTime.now() : sampledAt;
  }
}
