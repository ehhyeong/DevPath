package com.devpath.domain.roadmap.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "prerequisites")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Prerequisite {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "prerequisite_id")
  private Long prerequisiteId;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "node_id", nullable = false)
  private RoadmapNode node;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "pre_node_id", nullable = false)
  private RoadmapNode preNode;
}
