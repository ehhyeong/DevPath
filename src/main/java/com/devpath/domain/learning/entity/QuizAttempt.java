package com.devpath.domain.learning.entity;

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
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(name = "quiz_attempts")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class QuizAttempt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "attempt_id")
    private Long id;

    // 어떤 퀴즈를 응시한 기록인지 나타낸다.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "quiz_id", nullable = false)
    private Quiz quiz;

    // 현재 레포 구조상 learner 전용 엔티티 대신 User를 학습자 참조로 사용한다.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "learner_id", nullable = false)
    private User learner;

    // 최종 채점 후 획득한 점수를 저장한다.
    @Column(nullable = false)
    private Integer score = 0;

    // 해당 응시 시점 기준의 만점을 저장한다.
    @Column(name = "max_score", nullable = false)
    private Integer maxScore;

    // 응시 시작 시각을 저장한다.
    @Column(name = "started_at", nullable = false)
    private LocalDateTime startedAt;

    // 응시 완료 시각을 저장한다.
    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    // 응시에 소요된 시간을 초 단위로 저장한다.
    @Column(name = "time_spent_seconds")
    private Integer timeSpentSeconds;

    // 합격 여부나 통과 여부를 저장한다.
    @Column(name = "is_passed")
    private Boolean isPassed;

    // 같은 퀴즈에 대한 n번째 응시인지 저장한다.
    @Column(name = "attempt_number", nullable = false)
    private Integer attemptNumber;

    // 실제 삭제 대신 논리 삭제를 적용하기 위한 플래그다.
    @Column(name = "is_deleted", nullable = false)
    private Boolean isDeleted = false;

    // 생성 시각을 자동 저장한다.
    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    // 수정 시각을 자동 갱신한다.
    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Builder
    public QuizAttempt(
            Quiz quiz,
            User learner,
            Integer score,
            Integer maxScore,
            LocalDateTime startedAt,
            LocalDateTime completedAt,
            Integer timeSpentSeconds,
            Boolean isPassed,
            Integer attemptNumber,
            Boolean isDeleted
    ) {
        this.quiz = quiz;
        this.learner = learner;
        this.score = score == null ? 0 : score;
        this.maxScore = maxScore == null ? 0 : maxScore;
        this.startedAt = startedAt == null ? LocalDateTime.now() : startedAt;
        this.completedAt = completedAt;
        this.timeSpentSeconds = timeSpentSeconds;
        this.isPassed = isPassed;
        this.attemptNumber = attemptNumber == null ? 1 : attemptNumber;
        this.isDeleted = isDeleted == null ? false : isDeleted;
    }

    // 채점 결과와 종료 시각을 함께 반영하여 응시를 완료 상태로 만든다.
    public void completeAttempt(int score, int maxScore, boolean isPassed, int timeSpentSeconds) {
        this.score = score;
        this.maxScore = maxScore;
        this.isPassed = isPassed;
        this.timeSpentSeconds = timeSpentSeconds;
        this.completedAt = LocalDateTime.now();
    }

    // 응시 기록을 soft delete 처리한다.
    public void delete() {
        this.isDeleted = true;
    }
}
