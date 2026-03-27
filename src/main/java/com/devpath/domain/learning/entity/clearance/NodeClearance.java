package com.devpath.domain.learning.entity.clearance;

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
import jakarta.persistence.UniqueConstraint;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

// 학습자별 노드 클리어 판정 결과를 저장한다.
@Entity
@Table(
    name = "node_clearances",
    uniqueConstraints = {
        @UniqueConstraint(
            name = "uk_node_clearances_user_node",
            columnNames = {"user_id", "node_id"}
        )
    }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class NodeClearance {

    // 노드 클리어 PK다.
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "node_clearance_id")
    private Long id;

    // 판정 대상 학습자다.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // 판정 대상 로드맵 노드다.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "node_id", nullable = false)
    private RoadmapNode node;

    // 최종 클리어 상태다.
    @Enumerated(EnumType.STRING)
    @Column(name = "clearance_status", nullable = false, length = 30)
    private ClearanceStatus clearanceStatus;

    // 레슨 완강률이다.
    @Column(name = "lesson_completion_rate", nullable = false, precision = 5, scale = 2)
    private BigDecimal lessonCompletionRate;

    // 필수 태그 충족 여부다.
    @Column(name = "required_tags_satisfied", nullable = false)
    private Boolean requiredTagsSatisfied;

    // 부족한 태그 개수다.
    @Column(name = "missing_tag_count", nullable = false)
    private Integer missingTagCount;

    // 레슨 완강 여부다.
    @Column(name = "lesson_completed", nullable = false)
    private Boolean lessonCompleted;

    // 퀴즈 통과 여부다.
    @Column(name = "quiz_passed", nullable = false)
    private Boolean quizPassed;

    // 과제 통과 여부다.
    @Column(name = "assignment_passed", nullable = false)
    private Boolean assignmentPassed;

    // Proof 발급 가능 여부다.
    @Column(name = "proof_eligible", nullable = false)
    private Boolean proofEligible;

    // 실제 클리어 처리 시각이다.
    @Column(name = "cleared_at")
    private LocalDateTime clearedAt;

    // 마지막 재계산 시각이다.
    @Column(name = "last_calculated_at", nullable = false)
    private LocalDateTime lastCalculatedAt;

    // 생성 시각이다.
    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    // 수정 시각이다.
    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // 노드 클리어 엔티티를 생성한다.
    @Builder
    public NodeClearance(User user, RoadmapNode node) {
        this.user = user;
        this.node = node;
        this.clearanceStatus = ClearanceStatus.NOT_CLEARED;
        this.lessonCompletionRate = BigDecimal.ZERO;
        this.requiredTagsSatisfied = false;
        this.missingTagCount = 0;
        this.lessonCompleted = false;
        this.quizPassed = false;
        this.assignmentPassed = false;
        this.proofEligible = false;
        this.lastCalculatedAt = LocalDateTime.now();
    }

    // 평가 결과로 노드 클리어 상태를 갱신한다.
    public void recalculate(
        ClearanceStatus clearanceStatus,
        BigDecimal lessonCompletionRate,
        Boolean requiredTagsSatisfied,
        Integer missingTagCount,
        Boolean lessonCompleted,
        Boolean quizPassed,
        Boolean assignmentPassed,
        Boolean proofEligible
    ) {
        this.clearanceStatus = clearanceStatus;
        this.lessonCompletionRate = lessonCompletionRate;
        this.requiredTagsSatisfied = requiredTagsSatisfied;
        this.missingTagCount = missingTagCount;
        this.lessonCompleted = lessonCompleted;
        this.quizPassed = quizPassed;
        this.assignmentPassed = assignmentPassed;
        this.proofEligible = proofEligible;
        this.lastCalculatedAt = LocalDateTime.now();

        if (ClearanceStatus.CLEARED.equals(clearanceStatus)) {
            this.clearedAt = LocalDateTime.now();
            return;
        }

        this.clearedAt = null;
    }
}
