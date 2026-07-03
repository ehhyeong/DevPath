package com.devpath.domain.roadmap.entity;

import jakarta.persistence.*;
import java.util.Collection;
import java.util.function.Predicate;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(
    name = "custom_node_prerequisites",
    indexes = {
      @Index(
          name = "idx_custom_node_prerequisites_custom_roadmap_id",
          columnList = "custom_roadmap_id")
    })
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CustomNodePrerequisite {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "custom_node_prerequisite_id")
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "custom_roadmap_id", nullable = false)
  private CustomRoadmap customRoadmap;

  // 현재 노드
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "custom_node_id", nullable = false)
  private CustomRoadmapNode customNode;

  // 선행 노드
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "prerequisite_custom_node_id", nullable = false)
  private CustomRoadmapNode prerequisiteCustomNode;

  // 선행 조건 그룹(OR 묶음, CNF). 같은 (customNode, prereq_group) 엣지끼리는 OR(하나만 충족돼도 통과),
  // 서로 다른 그룹끼리는 AND(모든 그룹이 충족돼야 통과). 일반 선형 엣지는 각자 단독 그룹이라 기존 AND와 같고,
  // 갈림길 합류만 갈래 끝들을 한 그룹으로 묶어 OR가 된다. DDL DEFAULT 0 — 컬럼을 생략하는 시드 INSERT가
  // 실패하지 않게 하며, 시드가 넣는 값은 런타임 rebuild가 조회/클리어 전에 항상 재생성해 덮으므로 무해하다.
  @Column(name = "prereq_group", nullable = false, columnDefinition = "integer default 0")
  private int prereqGroup;

  @Builder
  public CustomNodePrerequisite(
      CustomRoadmap customRoadmap,
      CustomRoadmapNode customNode,
      CustomRoadmapNode prerequisiteCustomNode,
      int prereqGroup) {
    this.customRoadmap = customRoadmap;
    this.customNode = customNode;
    this.prerequisiteCustomNode = prerequisiteCustomNode;
    this.prereqGroup = prereqGroup;
  }

  /**
   * CNF 선행 판정: 선행 조건 그룹({@code groups})마다 최소 1개가 충족되면(=모든 그룹 통과) 통과. 빈 그룹·그룹 없음은 제약 없음으로 통과.
   * 조회(CustomRoadmapQueryService)·잠금표시(MyRoadmapDto)·클리어(NodeClearanceCommandService) 세 게이트가 공유하는 단일 판정 규칙이다.
   * {@code satisfied}는 선행 노드 id가 완료(또는 보류)됐는지를 돌려준다.
   */
  public static boolean prerequisitesMet(
      Collection<? extends Collection<Long>> groups, Predicate<Long> satisfied) {
    return groups.stream().allMatch(group -> group.isEmpty() || group.stream().anyMatch(satisfied));
  }
}
