package com.devpath.domain.roadmap.entity;

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
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "roadmap_nodes")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class RoadmapNode {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "node_id")
  private Long nodeId;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "roadmap_id", nullable = false)
  private Roadmap roadmap;

  @Column(nullable = false)
  private String title;

  @Column(columnDefinition = "TEXT")
  private String content;

  @Column(name = "node_type")
  private String nodeType;

  @Column(name = "sort_order")
  private Integer sortOrder;

  @Column(name = "sub_topics", columnDefinition = "TEXT")
  private String subTopics;

  // ── 레인 트리 모델. 커스텀 로드맵과 동일한 구조 표현을 공식 로드맵에도 적용한다. ──
  // 이 레인이 갈라져 나온 부모 노드 id (null = 루트 척추 레인)
  @Column(name = "anchor_node_id")
  private Long anchorNodeId;

  // 같은 앵커의 형제 레인 구분. 루트 척추 레인은 null.
  @Column(name = "lane_key")
  private Integer laneKey;

  // 레인 종류: SPINE/BRANCH/REVIEW/ADVANCED
  @Enumerated(EnumType.STRING)
  @Column(name = "branch_kind", length = 20)
  private BranchKind branchKind;

  // 레인 내 순서
  @Column(name = "order_in_lane")
  private Integer orderInLane;

  // 강의 활동 노드([CATALOG] 퀴즈/과제)가 연결된 강의 섹션 순번. 로드맵 분기와는 무관하다.
  @Column(name = "section_order")
  private Integer sectionOrder;

  // 레인 필드를 일괄 배치한다. 관리자가 입력한 (sortOrder, laneKey)에서 나머지를 파생할 때 사용한다.
  public void assignLane(
      BranchKind branchKind, Long anchorNodeId, Integer laneKey, Integer orderInLane) {
    this.branchKind = branchKind;
    this.anchorNodeId = anchorNodeId;
    this.laneKey = laneKey;
    this.orderInLane = orderInLane;
  }

  public void changeNodeType(String nodeType) {
    this.nodeType = nodeType;
  }

  public void updateInfo(String title, String content, String nodeType) {
    this.title = title;
    this.content = content;
    this.nodeType = nodeType;
  }

  public void updateAdminInfo(
      String title,
      String content,
      String nodeType,
      Integer sortOrder,
      String subTopics,
      Integer laneKey) {
    this.title = title;
    this.content = content;
    this.nodeType = nodeType;
    this.sortOrder = sortOrder;
    this.subTopics = subTopics;
    this.laneKey = laneKey;
  }
}
