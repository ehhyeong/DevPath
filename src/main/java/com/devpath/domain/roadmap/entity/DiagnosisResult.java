package com.devpath.domain.roadmap.entity;

import com.devpath.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "diagnosis_results")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class DiagnosisResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "result_id")
    private Long resultId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "roadmap_id", nullable = false)
    private Roadmap roadmap;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "quiz_id", nullable = false)
    private DiagnosisQuiz quiz;

    @Column(name = "score", nullable = false)
    private Integer score;

    @Column(name = "max_score", nullable = false)
    private Integer maxScore;

    @Column(name = "weak_areas", columnDefinition = "TEXT")
    private String weakAreas;

    @Column(name = "recommended_nodes", columnDefinition = "TEXT")
    private String recommendedNodes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    @Builder
    public DiagnosisResult(User user, Roadmap roadmap, DiagnosisQuiz quiz,
                           Integer score, Integer maxScore,
                           String weakAreas, String recommendedNodes) {
        this.user = user;
        this.roadmap = roadmap;
        this.quiz = quiz;
        this.score = score;
        this.maxScore = maxScore;
        this.weakAreas = weakAreas;
        this.recommendedNodes = recommendedNodes;
    }

    // 비즈니스 메서드
    public void updateWeakAreas(String weakAreas) {
        this.weakAreas = weakAreas;
    }

    public void updateRecommendedNodes(String recommendedNodes) {
        this.recommendedNodes = recommendedNodes;
    }

    public double getScorePercentage() {
        if (maxScore == 0) return 0.0;
        return (double) score / maxScore * 100;
    }
}
