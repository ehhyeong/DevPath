package com.devpath.domain.roadmap.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "roadmap_nodes")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RoadmapNode {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "node_id")
    private Long id;

    // 이 노드가 속한 로드맵
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "roadmap_id", nullable = false)
    private Roadmap roadmap;

    // 트리 구조를 위한 자기 참조 (내 부모 노드가 누구인가?)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_node_id")
    private RoadmapNode parentNode;

    @Column(nullable = false, length = 100)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "order_index", nullable = false)
    private Integer orderIndex; // 같은 레벨에서의 순서

    @Builder
    public RoadmapNode(Roadmap roadmap, RoadmapNode parentNode, String title, String description, Integer orderIndex) {
        this.roadmap = roadmap;
        this.parentNode = parentNode;
        this.title = title;
        this.description = description;
        this.orderIndex = orderIndex;
    }
}