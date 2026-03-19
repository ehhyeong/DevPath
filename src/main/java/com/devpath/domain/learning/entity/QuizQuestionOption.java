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
@Table(name = "quiz_question_options")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class QuizQuestionOption {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "option_id")
    private Long id;

    // 이 선택지가 어떤 문항에 속하는지 나타내는 상위 연관관계다.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", nullable = false)
    private QuizQuestion question;

    // 사용자에게 보여줄 선택지 텍스트다.
    @Column(name = "option_text", columnDefinition = "TEXT", nullable = false)
    private String optionText;

    // 해당 선택지가 정답인지 여부를 저장한다.
    @Column(name = "is_correct", nullable = false)
    private Boolean isCorrect = false;

    // 선택지 표시 순서를 저장한다.
    @Column(name = "display_order", nullable = false)
    private Integer displayOrder;

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
    public QuizQuestionOption(
            QuizQuestion question,
            String optionText,
            Boolean isCorrect,
            Integer displayOrder,
            Boolean isDeleted
    ) {
        this.question = question;
        this.optionText = optionText;
        this.isCorrect = isCorrect == null ? false : isCorrect;
        this.displayOrder = displayOrder == null ? 0 : displayOrder;
        this.isDeleted = isDeleted == null ? false : isDeleted;
    }

    // QuizQuestion.addOption()에서 내부적으로 사용하는 상위 문항 할당 메서드다.
    void assignQuestion(QuizQuestion question) {
        this.question = question;
    }

    // 선택지 내용, 정답 여부, 표시 순서를 한 번에 수정한다.
    public void updateOption(String optionText, Boolean isCorrect, Integer displayOrder) {
        this.optionText = optionText;
        this.isCorrect = isCorrect;
        this.displayOrder = displayOrder;
    }

    // 선택지를 soft delete 처리한다.
    public void delete() {
        this.isDeleted = true;
    }
}
