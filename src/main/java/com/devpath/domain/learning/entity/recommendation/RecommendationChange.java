package com.devpath.domain.learning.entity.recommendation;

import com.devpath.domain.roadmap.entity.RoadmapNode;
import com.devpath.domain.user.entity.User;
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
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(name = "recommendation_changes")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RecommendationChange {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "recommendation_change_id")
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "user_id", nullable = false)
  private User user;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "node_id", nullable = false)
  private RoadmapNode roadmapNode;

  @Column(name = "source_recommendation_id")
  private Long sourceRecommendationId;

  @Column(name = "branch_from_node_id")
  private Long branchFromNodeId;

  // 성장공고(TASK-39) 기원 추천 전용: 삽입 대상 커스텀 로드맵 / anchor 커스텀 노드 / 분기 종류.
  // 셋 다 null이면 기존(진단퀴즈/보강) 경로, target_custom_roadmap_id가 있으면 명시적 타깃 삽입 경로로 분기한다.
  @Column(name = "target_custom_roadmap_id")
  private Long targetCustomRoadmapId;

  @Column(name = "anchor_custom_node_id")
  private Long anchorCustomNodeId;

  @Column(name = "branch_type", length = 20)
  private String branchType;

  @Column(name = "reason", nullable = false, columnDefinition = "TEXT")
  private String reason;

  @Column(name = "context_summary", columnDefinition = "TEXT")
  private String contextSummary;

  @Enumerated(EnumType.STRING)
  @Column(name = "node_change_type", nullable = false, length = 10)
  private NodeChangeType nodeChangeType;

  @Enumerated(EnumType.STRING)
  @Column(name = "change_status", nullable = false, length = 30)
  private RecommendationChangeStatus changeStatus;

  @Enumerated(EnumType.STRING)
  @Column(name = "decision_status", nullable = false, length = 30)
  private RecommendationDecisionStatus decisionStatus;

  @Column(name = "suggested_at", nullable = false)
  private LocalDateTime suggestedAt;

  @Column(name = "applied_at")
  private LocalDateTime appliedAt;

  @Column(name = "ignored_at")
  private LocalDateTime ignoredAt;

  @CreationTimestamp
  @Column(name = "created_at", updatable = false)
  private LocalDateTime createdAt;

  @UpdateTimestamp
  @Column(name = "updated_at")
  private LocalDateTime updatedAt;

  @Builder
  public RecommendationChange(
      User user,
      RoadmapNode roadmapNode,
      Long sourceRecommendationId,
      Long branchFromNodeId,
      Long targetCustomRoadmapId,
      Long anchorCustomNodeId,
      String branchType,
      String reason,
      String contextSummary,
      NodeChangeType nodeChangeType,
      RecommendationChangeStatus changeStatus,
      RecommendationDecisionStatus decisionStatus,
      LocalDateTime suggestedAt) {
    this.user = user;
    this.roadmapNode = roadmapNode;
    this.sourceRecommendationId = sourceRecommendationId;
    this.branchFromNodeId = branchFromNodeId;
    this.targetCustomRoadmapId = targetCustomRoadmapId;
    this.anchorCustomNodeId = anchorCustomNodeId;
    this.branchType = branchType;
    this.reason = reason;
    this.contextSummary = contextSummary;
    this.nodeChangeType = nodeChangeType == null ? NodeChangeType.ADD : nodeChangeType;
    this.changeStatus = changeStatus == null ? RecommendationChangeStatus.SUGGESTED : changeStatus;
    this.decisionStatus =
        decisionStatus == null ? RecommendationDecisionStatus.UNDECIDED : decisionStatus;
    this.suggestedAt = suggestedAt == null ? LocalDateTime.now() : suggestedAt;
  }

  public void apply() {
    this.changeStatus = RecommendationChangeStatus.APPLIED;
    this.decisionStatus = RecommendationDecisionStatus.APPLIED;
    this.appliedAt = LocalDateTime.now();
  }

  public void ignore() {
    this.changeStatus = RecommendationChangeStatus.IGNORED;
    this.decisionStatus = RecommendationDecisionStatus.IGNORED;
    this.ignoredAt = LocalDateTime.now();
  }

  public void markRecalculated() {
    this.changeStatus = RecommendationChangeStatus.RECALCULATED;
  }
}
