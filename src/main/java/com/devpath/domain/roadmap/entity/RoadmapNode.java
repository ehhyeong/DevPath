package com.devpath.domain.roadmap.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "roadmap_nodes")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
// 하나의 로드맵 안에서 사용자가 학습해야 할 단계를 저장하는 엔티티
public class RoadmapNode {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "node_id")
  // 각 학습 단계를 구분하기 위한 기본 키
  private Long nodeId;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "roadmap_id", nullable = false)
  // 어떤 로드맵에 속한 단계인지 연결한다.
  // 지연 로딩을 사용해 노드 조회 시 로드맵 전체를 즉시 불러오지 않도록 한다.
  private Roadmap roadmap;

  @Column(nullable = false)
  // 학습 단계의 제목이다. 예: Java Basics, Spring Boot Basics
  private String title;

  @Column(columnDefinition = "TEXT")
  // 학습 단계에 대한 상세 설명이나 학습 내용을 저장한다.
  private String content;

  @Column(name = "node_type")
  // 노드의 성격을 구분하는 값이다. 예: CONCEPT, PRACTICE
  private String nodeType;

  @Column(name = "sort_order")
  // 로드맵 화면에서 노드가 어떤 순서로 보여질지 결정한다.
  private Integer sortOrder;
}
