package com.devpath.domain.roadmap.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "prerequisites")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
// 두 학습 노드 사이의 선수 학습 관계를 저장하는 엔티티
public class Prerequisite {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "prerequisite_id")
  // 선수 관계 자체를 식별하기 위한 기본 키
  private Long prerequisiteId;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "node_id", nullable = false)
  // 학습 대상이 되는 노드이다.
  // 즉, 이 노드를 학습하기 전에 다른 노드를 먼저 끝내야 할 수 있다.
  private RoadmapNode node;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "pre_node_id", nullable = false)
  // 현재 노드를 시작하기 전에 먼저 학습해야 하는 선행 노드이다.
  private RoadmapNode preNode;
}
