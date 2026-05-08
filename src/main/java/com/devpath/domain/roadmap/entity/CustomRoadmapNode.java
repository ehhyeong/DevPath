package com.devpath.domain.roadmap.entity;

import com.devpath.domain.builder.entity.BuilderModule;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(
    name = "custom_roadmap_nodes",
    indexes = {
      @Index(name = "idx_custom_roadmap_nodes_custom_roadmap_id", columnList = "custom_roadmap_id")
    })
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CustomRoadmapNode {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "custom_node_id")
  private Long id;

  // 내가 가진 커스텀 로드맵에 속함
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "custom_roadmap_id", nullable = false)
  private CustomRoadmap customRoadmap;

  // 복사의 원본이 된 마스터 로드맵 노드 (빌더 기원 노드는 null)
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "original_node_id", nullable = true)
  private RoadmapNode originalNode;

  // 빌더 기원 노드 전용 모듈 참조 (originalNode가 null일 때 사용)
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "builder_module_id")
  private BuilderModule builderModule;

  // 빌더 기원 노드 전용 분기 그룹 (null=척추, 1=왼쪽, 2=오른쪽)
  @Column(name = "builder_branch_group")
  private Integer builderBranchGroup;

  // 문자열(VARCHAR)로 DB에 저장하도록 지정
  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private NodeStatus status;

  // 커스텀 로드맵 내 표시 순서 (원본 sort_order 기반으로 초기화, ADD 시 재정렬 반영)
  @Column(name = "custom_sort_order")
  private Integer customSortOrder;

  // 진단 퀴즈 결과로 생성된 추천 분기 노드 여부
  @Column(name = "is_branch", nullable = false)
  private boolean isBranch = false;

  // 어느 원본 노드(original_node_id)에서 갈라진 분기인지 (일반 노드는 null)
  @Column(name = "branch_from_node_id")
  private Long branchFromNodeId;

  // 분기 종류: "REVIEW"(복습) | "ADVANCED"(심화) | null(일반 노드)
  @Column(name = "branch_type", length = 20)
  private String branchType;

  @Column(name = "started_at")
  private LocalDateTime startedAt;

  @Column(name = "completed_at")
  private LocalDateTime completedAt;

  @Builder
  public CustomRoadmapNode(
      CustomRoadmap customRoadmap,
      RoadmapNode originalNode,
      Integer customSortOrder,
      boolean isBranch,
      Long branchFromNodeId,
      String branchType) {
    this.customRoadmap = customRoadmap;
    this.originalNode = originalNode;
    this.status = NodeStatus.NOT_STARTED;
    this.customSortOrder =
        customSortOrder != null
            ? customSortOrder
            : (originalNode != null ? originalNode.getSortOrder() : null);
    this.isBranch = isBranch;
    this.branchFromNodeId = branchFromNodeId;
    this.branchType = branchType;
  }

  @Builder(builderMethodName = "builderNodeBuilder", builderClassName = "BuilderNodeBuilder")
  public CustomRoadmapNode(
      CustomRoadmap customRoadmap,
      BuilderModule builderModule,
      Integer customSortOrder,
      Integer builderBranchGroup) {
    this.customRoadmap = customRoadmap;
    this.builderModule = builderModule;
    this.originalNode = null;
    this.status = NodeStatus.NOT_STARTED;
    this.customSortOrder = customSortOrder;
    this.builderBranchGroup = builderBranchGroup;
  }

  // 커스텀 순서 변경 비즈니스 메서드 (노드 삽입 시 기존 노드 밀기에 사용)
  public void shiftSortOrder(int delta) {
    if (this.customSortOrder != null) {
      this.customSortOrder += delta;
    }
  }

  // 학습 시작 상태로 변경하는 비즈니스 메서드
  public void startLearning() {
    this.status = NodeStatus.IN_PROGRESS;
    this.startedAt = LocalDateTime.now();
  }

  // 학습 완료 상태로 변경하는 비즈니스 메서드
  public void completeLearning() {
    this.status = NodeStatus.COMPLETED;
    this.completedAt = LocalDateTime.now();
  }

  // 노드 완료 (스킵 포함) - completeLearning()과 동일한 동작
  public void complete() {
    completeLearning();
  }
}
