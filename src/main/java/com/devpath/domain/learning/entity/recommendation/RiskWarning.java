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
@Table(name = "risk_warnings")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RiskWarning {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "warning_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "node_id")
    private RoadmapNode roadmapNode;

    @Column(name = "warning_type", nullable = false, length = 50)
    private String warningType;

    @Column(name = "risk_level", nullable = false, length = 20)
    private String riskLevel;

    @Column(name = "message", columnDefinition = "TEXT")
    private String message;

    @Column(name = "is_acknowledged", nullable = false)
    private Boolean isAcknowledged = false;

    @Column(name = "acknowledged_at")
    private LocalDateTime acknowledgedAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Builder
    public RiskWarning(
            User user,
            RoadmapNode roadmapNode,
            String warningType,
            String riskLevel,
            String message,
            Boolean isAcknowledged,
            LocalDateTime acknowledgedAt
    ) {
        this.user = user;
        this.roadmapNode = roadmapNode;
        this.warningType = warningType;
        this.riskLevel = riskLevel == null ? "MEDIUM" : riskLevel;
        this.message = message;
        this.isAcknowledged = isAcknowledged == null ? false : isAcknowledged;
        this.acknowledgedAt = acknowledgedAt;
    }

    public void acknowledge() {
        this.isAcknowledged = true;
        this.acknowledgedAt = LocalDateTime.now();
    }
}
