package com.devpath.domain.roadmap.entity;

import com.devpath.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "diagnosis_quizzes")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class DiagnosisQuiz {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "quiz_id")
    private Long quizId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "roadmap_id", nullable = false)
    private Roadmap roadmap;

    @Column(name = "question_count", nullable = false)
    private Integer questionCount;

    @Enumerated(EnumType.STRING)
    @Column(name = "difficulty", nullable = false, length = 20)
    private QuizDifficulty difficulty;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    @Builder
    public DiagnosisQuiz(User user, Roadmap roadmap, Integer questionCount, QuizDifficulty difficulty) {
        this.user = user;
        this.roadmap = roadmap;
        this.questionCount = questionCount;
        this.difficulty = difficulty;
    }

    // 비즈니스 메서드
    public void submit() {
        this.submittedAt = LocalDateTime.now();
    }
}
