package com.devpath.domain.learning.entity;

import com.devpath.domain.roadmap.entity.RoadmapNode;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "assignments")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Assignment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "assignment_id")
    private Long id;

    // 어떤 노드(과목)에 달린 과제인가?
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "node_id", nullable = false)
    private RoadmapNode roadmapNode;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String description;

    @Builder
    public Assignment(RoadmapNode roadmapNode, String title, String description) {
        this.roadmapNode = roadmapNode;
        this.title = title;
        this.description = description;
    }
}