package com.devpath.domain.learning.entity.recommendation;

import com.devpath.domain.roadmap.entity.RoadmapNode;
import com.devpath.domain.user.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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

@Entity
@Table(name = "recommendation_histories")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RecommendationHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "history_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "recommendation_id")
    private Long recommendationId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "node_id")
    private RoadmapNode roadmapNode;

    @Column(name = "before_status", length = 30)
    private String beforeStatus;

    @Column(name = "after_status", length = 30)
    private String afterStatus;

    @Column(name = "action_type", nullable = false, length = 30)
    private String actionType;

    @Column(name = "context", columnDefinition = "TEXT")
    private String context;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Builder
    public RecommendationHistory(
            User user,
            Long recommendationId,
            RoadmapNode roadmapNode,
            String beforeStatus,
            String afterStatus,
            String actionType,
            String context
    ) {
        this.user = user;
        this.recommendationId = recommendationId;
        this.roadmapNode = roadmapNode;
        this.beforeStatus = beforeStatus;
        this.afterStatus = afterStatus;
        this.actionType = actionType;
        this.context = context;
    }
}
