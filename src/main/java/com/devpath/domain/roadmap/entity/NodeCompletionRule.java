package com.devpath.domain.roadmap.entity;

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
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(name = "node_completion_rules")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class NodeCompletionRule {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "completion_rule_id")
  private Long completionRuleId;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "node_id", nullable = false, unique = true)
  private RoadmapNode node;

  @Column(name = "criteria_type", nullable = false, length = 50)
  private String criteriaType;

  @Column(name = "criteria_value", nullable = false, columnDefinition = "TEXT")
  private String criteriaValue;

  @CreationTimestamp
  @Column(name = "created_at", updatable = false)
  private LocalDateTime createdAt;

  @UpdateTimestamp
  @Column(name = "updated_at")
  private LocalDateTime updatedAt;

  public void updateRule(String criteriaType, String criteriaValue) {
    this.criteriaType = criteriaType;
    this.criteriaValue = criteriaValue;
  }
}
