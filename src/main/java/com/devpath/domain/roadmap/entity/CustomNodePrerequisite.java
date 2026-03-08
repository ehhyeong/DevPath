package com.devpath.domain.roadmap.entity;

import jakarta.persistence.*;
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

  @Builder
  public CustomNodePrerequisite(
      CustomRoadmap customRoadmap,
      CustomRoadmapNode customNode,
      CustomRoadmapNode prerequisiteCustomNode) {
    this.customRoadmap = customRoadmap;
    this.customNode = customNode;
    this.prerequisiteCustomNode = prerequisiteCustomNode;
  }
}
