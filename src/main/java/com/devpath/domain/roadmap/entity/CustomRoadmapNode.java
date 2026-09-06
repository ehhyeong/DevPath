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

  // 문자열(VARCHAR)로 DB에 저장하도록 지정
  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private NodeStatus status;

  // 커스텀 로드맵 내 표시 순서 (원본 sort_order 기반으로 초기화, ADD 시 재정렬 반영)
  @Column(name = "custom_sort_order")
  private Integer customSortOrder;

  // ── 레인 트리 모델. 그래프/잠금은 이 필드로 동작한다. ──
  // 위치 노드(SPINE/BRANCH)는 customSortOrder + 갈래 번호에서 재도출되는 파생값이고,
  // 앵커 분기(REVIEW/ADVANCED)의 anchorNodeId는 부모를 직접 가리키는 원본값이다(파생 불가).
  // 이 레인이 갈라져 나온 부모 커스텀 노드 id (null = 루트 척추 레인)
  @Column(name = "anchor_node_id")
  private Long anchorNodeId;

  // 같은 앵커의 형제 레인 구분(좌/우/복습/심화 등). 루트 척추 레인은 단일.
  @Column(name = "lane_key")
  private Integer laneKey;

  // 레인 종류: SPINE/BRANCH/REVIEW/ADVANCED
  @Enumerated(EnumType.STRING)
  @Column(name = "branch_kind", length = 20)
  private BranchKind branchKind;

  // 레인 내 순서. 위치 노드는 재배치(relayout) 시 customSortOrder 기준으로 재도출된다.
  @Column(name = "order_in_lane")
  private Integer orderInLane;

  @Column(name = "started_at")
  private LocalDateTime startedAt;

  @Column(name = "completed_at")
  private LocalDateTime completedAt;

  // 노드가 로드맵에 추가된 시각. branch 노드 재학습 게이트의 기준 시점으로 사용한다.
  @Column(name = "created_at", updatable = false)
  private LocalDateTime createdAt;

  // 보류(defer): 완료하지 않아도 다음 노드 진행을 허용한다. 클리어/삭제와 무관(미완료 상태 유지, 되돌리기 가능).
  @Column(name = "is_deferred", nullable = false, columnDefinition = "boolean default false")
  private boolean deferred = false;

  @PrePersist
  void onCreate() {
    if (this.createdAt == null) {
      this.createdAt = LocalDateTime.now();
    }
  }

  @Builder
  public CustomRoadmapNode(
      CustomRoadmap customRoadmap, RoadmapNode originalNode, Integer customSortOrder) {
    this.customRoadmap = customRoadmap;
    this.originalNode = originalNode;
    this.status = NodeStatus.NOT_STARTED;
    this.customSortOrder =
        customSortOrder != null
            ? customSortOrder
            : (originalNode != null ? originalNode.getSortOrder() : null);
  }

  @Builder(builderMethodName = "builderNodeBuilder", builderClassName = "BuilderNodeBuilder")
  public CustomRoadmapNode(
      CustomRoadmap customRoadmap, BuilderModule builderModule, Integer customSortOrder) {
    this.customRoadmap = customRoadmap;
    this.builderModule = builderModule;
    this.originalNode = null;
    this.status = NodeStatus.NOT_STARTED;
    this.customSortOrder = customSortOrder;
  }

  // 커스텀 순서 변경 비즈니스 메서드 (노드 삽입 시 기존 노드 밀기에 사용)
  public void shiftSortOrder(int delta) {
    if (this.customSortOrder != null) {
      this.customSortOrder += delta;
    }
  }

  // 커스텀 순서를 특정 값으로 설정한다(수동 순서변경 시 재번호 매기기에 사용).
  public void changeCustomSortOrder(Integer order) {
    this.customSortOrder = order;
  }

  // 레인 필드를 일괄 배치한다. 앵커는 저장 후 부여되는 커스텀노드 id라 2-pass에서 호출.
  public void assignLane(
      BranchKind branchKind, Long anchorNodeId, Integer laneKey, Integer orderInLane) {
    this.branchKind = branchKind;
    this.anchorNodeId = anchorNodeId;
    this.laneKey = laneKey;
    this.orderInLane = orderInLane;
  }

  /** 재학습 게이트 대상(복습/심화)인가. 앵커에 매달린 선택 학습 노드만 해당한다. */
  public boolean isRelearnGated() {
    return branchKind == BranchKind.REVIEW || branchKind == BranchKind.ADVANCED;
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
    this.deferred = false;
  }

  // 보류 설정/해제 (완료하지 않아도 다음 노드 진행 허용)
  public void defer() {
    this.deferred = true;
  }

  public void undefer() {
    this.deferred = false;
  }

  // 노드 완료 (스킵 포함) - completeLearning()과 동일한 동작
  public void complete() {
    completeLearning();
  }
}
