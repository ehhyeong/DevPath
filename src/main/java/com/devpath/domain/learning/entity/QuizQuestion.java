package com.devpath.domain.learning.entity;

import jakarta.persistence.CascadeType;
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
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(name = "quiz_questions")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class QuizQuestion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "question_id")
    private Long id;

    // 이 문항이 어떤 퀴즈에 소속되는지 나타내는 상위 연관관계다.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "quiz_id", nullable = false)
    private Quiz quiz;

    // 객관식, OX, 주관식 중 어떤 유형의 문항인지 구분한다.
    @Enumerated(EnumType.STRING)
    @Column(name = "question_type", nullable = false, length = 30)
    private QuestionType questionType;

    // 실제 문항 본문 텍스트를 저장한다.
    @Column(name = "question_text", columnDefinition = "TEXT", nullable = false)
    private String questionText;

    // 정답 공개 시 함께 보여줄 해설을 저장한다.
    @Column(columnDefinition = "TEXT")
    private String explanation;

    // 해당 문항의 배점을 저장한다.
    @Column(nullable = false)
    private Integer points;

    // 문항 노출 순서를 저장한다.
    @Column(name = "display_order", nullable = false)
    private Integer displayOrder;

    // AI 생성 문제의 근거 영상 구간이나 타임코드를 저장한다.
    @Column(name = "source_timestamp", length = 50)
    private String sourceTimestamp;

    // 실제 삭제 대신 논리 삭제를 적용하기 위한 플래그다.
    @Column(name = "is_deleted", nullable = false)
    private Boolean isDeleted = false;

    // 하나의 문항은 여러 선택지를 가지며 문항 삭제 시 함께 정리되도록 설정한다.
    @OneToMany(mappedBy = "question", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<QuizQuestionOption> options = new ArrayList<>();

    // 생성 시각을 자동 저장한다.
    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    // 수정 시각을 자동 갱신한다.
    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Builder
    public QuizQuestion(
            Quiz quiz,
            QuestionType questionType,
            String questionText,
            String explanation,
            Integer points,
            Integer displayOrder,
            String sourceTimestamp,
            Boolean isDeleted,
            List<QuizQuestionOption> options
    ) {
        this.quiz = quiz;
        this.questionType = questionType;
        this.questionText = questionText;
        this.explanation = explanation;
        this.points = points == null ? 1 : points;
        this.displayOrder = displayOrder == null ? 0 : displayOrder;
        this.sourceTimestamp = sourceTimestamp;
        this.isDeleted = isDeleted == null ? false : isDeleted;
        this.options = new ArrayList<>();

        if (options != null) {
            options.forEach(this::addOption);
        }
    }

    // Quiz.addQuestion()에서 내부적으로 사용하는 상위 퀴즈 할당 메서드다.
    void assignQuiz(Quiz quiz) {
        this.quiz = quiz;
    }

    // 문항 유형, 본문, 해설, 배점, 순서, 근거 구간을 한 번에 수정한다.
    public void updateContent(
            QuestionType questionType,
            String questionText,
            String explanation,
            Integer points,
            Integer displayOrder,
            String sourceTimestamp
    ) {
        this.questionType = questionType;
        this.questionText = questionText;
        this.explanation = explanation;
        this.points = points;
        this.displayOrder = displayOrder;
        this.sourceTimestamp = sourceTimestamp;
    }

    // 연관관계 편의 메서드로 선택지를 추가하면서 양방향 참조도 같이 맞춘다.
    public void addOption(QuizQuestionOption option) {
        this.options.add(option);
        option.assignQuestion(this);
    }

    // 문항을 soft delete 처리한다.
    public void delete() {
        this.isDeleted = true;
    }
}
