package com.devpath.domain.learning.entity.recommendation;

import com.devpath.domain.roadmap.entity.RoadmapNode;
import com.devpath.domain.user.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(name = "supplement_recommendations")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SupplementRecommendation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "recommendation_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "node_id", nullable = false)
    private RoadmapNode roadmapNode;

    @Column(name = "reason", columnDefinition = "TEXT")
    private String reason;

    @Column(name = "priority")
    private Integer priority;

    @Column(name = "coverage_percent")
    private Double coveragePercent;

    @Column(name = "missing_tag_count")
    private Integer missingTagCount;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private RecommendationStatus status = RecommendationStatus.PENDING;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Builder
    public SupplementRecommendation(
            User user,
            RoadmapNode roadmapNode,
            String reason,
            Integer priority,
            Double coveragePercent,
            Integer missingTagCount,
            RecommendationStatus status
    ) {
        this.user = user;
        this.roadmapNode = roadmapNode;
        this.reason = reason;
        this.priority = priority;
        this.coveragePercent = coveragePercent;
        this.missingTagCount = missingTagCount;
        this.status = status == null ? RecommendationStatus.PENDING : status;
    }

    public void approve() {
        this.status = RecommendationStatus.APPROVED;
    }

    public void reject() {
        this.status = RecommendationStatus.REJECTED;
    }

    public void updateMetrics(Integer priority, Double coveragePercent, Integer missingTagCount, String reason) {
        this.priority = priority;
        this.coveragePercent = coveragePercent;
        this.missingTagCount = missingTagCount;
        this.reason = reason;
    }
}
