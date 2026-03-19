package com.devpath.domain.learning.entity;

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
@Table(name = "quiz_answers")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class QuizAnswer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "answer_id")
    private Long id;

    // 어떤 응시에 속한 답안인지 나타낸다.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "attempt_id", nullable = false)
    private QuizAttempt attempt;

    // 어떤 문항에 대한 답안인지 나타낸다.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", nullable = false)
    private QuizQuestion question;

    // 객관식이나 OX 문항에서 사용자가 선택한 선택지를 저장한다.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "selected_option_id")
    private QuizQuestionOption selectedOption;

    // 주관식 문항에 대한 사용자의 텍스트 답안을 저장한다.
    @Column(name = "text_answer", columnDefinition = "TEXT")
    private String textAnswer;

    // 해당 답안이 정답인지 여부를 채점 후 저장한다.
    @Column(name = "is_correct")
    private Boolean isCorrect;

    // 해당 문항에서 실제 획득한 점수를 저장한다.
    @Column(name = "points_earned")
    private Integer pointsEarned;

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
    public QuizAnswer(
            QuizAttempt attempt,
            QuizQuestion question,
            QuizQuestionOption selectedOption,
            String textAnswer,
            Boolean isCorrect,
            Integer pointsEarned,
            Boolean isDeleted
    ) {
        this.attempt = attempt;
        this.question = question;
        this.selectedOption = selectedOption;
        this.textAnswer = textAnswer;
        this.isCorrect = isCorrect;
        this.pointsEarned = pointsEarned == null ? 0 : pointsEarned;
        this.isDeleted = isDeleted == null ? false : isDeleted;
    }

    // 채점 결과를 반영하여 정오 여부와 획득 점수를 저장한다.
    public void markResult(boolean isCorrect, int pointsEarned) {
        this.isCorrect = isCorrect;
        this.pointsEarned = pointsEarned;
    }

    // 답안 기록을 soft delete 처리한다.
    public void delete() {
        this.isDeleted = true;
    }
}
