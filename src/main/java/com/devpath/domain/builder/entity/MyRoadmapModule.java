package com.devpath.domain.builder.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(
    name = "my_roadmap_modules",
    indexes = {@Index(name = "idx_my_roadmap_modules_my_roadmap_id", columnList = "my_roadmap_id")})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MyRoadmapModule {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "my_roadmap_id", nullable = false)
  private MyRoadmap myRoadmap;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "builder_module_id", nullable = false)
  private BuilderModule builderModule;

  @Column(name = "sort_order", nullable = false)
  private int sortOrder;

  // null=척추, 1=왼쪽 갈래, 2=오른쪽 갈래
  @Column(name = "lane_key")
  private Integer laneKey;

  @Builder
  public MyRoadmapModule(
      MyRoadmap myRoadmap, BuilderModule builderModule, int sortOrder, Integer laneKey) {
    this.myRoadmap = myRoadmap;
    this.builderModule = builderModule;
    this.sortOrder = sortOrder;
    this.laneKey = laneKey;
  }
}
