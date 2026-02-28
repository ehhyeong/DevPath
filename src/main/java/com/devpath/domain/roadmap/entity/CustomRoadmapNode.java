package com.devpath.domain.roadmap.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "custom_roadmap_nodes")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CustomRoadmapNode {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "custom_node_id")
    private Long id;

    // 내가 가진 커스텀 로드맵에 속함
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "custom_roadmap_id", nullable = false)
    private CustomRoadmap customRoadmap;

    // 복사의 원본이 된 마스터 로드맵 노드
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "original_node_id", nullable = false)
    private RoadmapNode originalNode;

    // 문자열(VARCHAR)로 DB에 저장하도록 지정
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private NodeStatus status;

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Builder
    public CustomRoadmapNode(CustomRoadmap customRoadmap, RoadmapNode originalNode) {
        this.customRoadmap = customRoadmap;
        this.originalNode = originalNode;
        this.status = NodeStatus.NOT_STARTED; // 초기 상태는 '시작 전'
    }

    // 학습 시작 상태로 변경하는 비즈니스 메서드
    public void startLearning() {
        this.status = NodeStatus.IN_PROGRESS;
        this.startedAt = LocalDateTime.now();
    }

    // 학습 완료 상태로 변경하는 비즈니스 메서드
    public void completeLearning() {
        this.status = NodeStatus.COMPLETED;
        this.completedAt = LocalDateTime.now();
    }
}