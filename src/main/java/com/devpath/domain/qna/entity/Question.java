package com.devpath.domain.qna.entity;

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

@Entity
@Table(name = "qna_questions")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Question {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "question_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "template_type", nullable = false, length = 50)
    private QuestionTemplateType templateType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private QuestionDifficulty difficulty;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    @Column(name = "adopted_answer_id")
    private Long adoptedAnswerId;

    @Column(name = "view_count", nullable = false)
    private int viewCount;

    @Column(name = "is_deleted", nullable = false)
    private boolean isDeleted;

    @Column(name = "created_at", updatable = false, nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Builder
    public Question(
            User user,
            QuestionTemplateType templateType,
            QuestionDifficulty difficulty,
            String title,
            String content
    ) {
        this.user = user;
        this.templateType = templateType;
        this.difficulty = difficulty;
        this.title = title;
        this.content = content;
        this.adoptedAnswerId = null;
        this.viewCount = 0;
        this.isDeleted = false;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    // 질문 상세 조회 시 조회수를 증가시킨다.
    public void incrementViewCount() {
        this.viewCount++;
    }

    // 이미 채택된 답변이 있는지 확인한다.
    public boolean hasAdoptedAnswer() {
        return this.adoptedAnswerId != null;
    }

    // 채택된 답변 ID를 질문에 반영한다.
    public void adoptAnswer(Long answerId) {
        this.adoptedAnswerId = answerId;
        this.updatedAt = LocalDateTime.now();
    }

    // 질문을 soft delete 처리한다.
    public void deleteQuestion() {
        this.isDeleted = true;
        this.updatedAt = LocalDateTime.now();
    }
}
