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

  public void changeNodeType(String nodeType) {
    this.nodeType = nodeType;
  }
}
