package com.devpath.domain.roadmap.entity;

import com.devpath.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "node_recommendations")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class NodeRecommendation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "recommendation_id")
    private Long recommendationId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "roadmap_id", nullable = false)
    private Roadmap roadmap;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "node_id", nullable = false)
    private RoadmapNode recommendedNode;

    @Enumerated(EnumType.STRING)
    @Column(name = "recommendation_type", nullable = false, length = 20)
    private RecommendationType recommendationType;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private RecommendationStatus status = RecommendationStatus.PENDING;

    @Column(name = "reason", columnDefinition = "TEXT")
    private String reason;

    @Column(name = "priority")
    private Integer priority;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    @Builder
    public NodeRecommendation(User user, Roadmap roadmap, RoadmapNode recommendedNode,
                              RecommendationType recommendationType, String reason,
                              Integer priority, LocalDateTime expiresAt) {
        this.user = user;
        this.roadmap = roadmap;
        this.recommendedNode = recommendedNode;
        this.recommendationType = recommendationType;
        this.reason = reason;
        this.priority = priority;
        this.expiresAt = expiresAt;
        this.status = RecommendationStatus.PENDING;
    }

    // 비즈니스 메서드
    public void accept() {
        this.status = RecommendationStatus.ACCEPTED;
    }

    public void reject() {
        this.status = RecommendationStatus.REJECTED;
    }

    public void expire() {
        this.status = RecommendationStatus.EXPIRED;
    }

    public boolean isPending() {
        return this.status == RecommendationStatus.PENDING;
    }

    public boolean isExpired() {
        return this.expiresAt != null && LocalDateTime.now().isAfter(this.expiresAt);
    }

    // 추천 타입 Enum
    public enum RecommendationType {
        REMEDIAL,    // 보강 노드 (부족한 영역)
        ADVANCED,    // 심화 노드 (추가 학습)
        OPTIONAL     // 선택 노드
    }
}
