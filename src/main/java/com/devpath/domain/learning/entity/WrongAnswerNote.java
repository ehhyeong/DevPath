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
@Table(name = "wrong_answer_notes")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class WrongAnswerNote {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "wrong_answer_note_id")
    private Long id;

    // 오답 노트를 작성한 학습자를 현재 레포 구조상 User 엔티티로 참조한다.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "learner_id", nullable = false)
    private User learner;

    // 어떤 응시 기록에서 나온 오답인지 추적하기 위한 연관관계다.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "attempt_id", nullable = false)
    private QuizAttempt attempt;

    // 어떤 문항에 대한 오답 노트인지 나타낸다.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", nullable = false)
    private QuizQuestion question;

    // 학습자가 남긴 복습 메모나 정리 내용을 저장한다.
    @Column(name = "note_content", columnDefinition = "TEXT", nullable = false)
    private String noteContent;

    // 해당 오답 항목을 복습 완료했는지 여부를 저장한다.
    @Column(name = "is_reviewed", nullable = false)
    private Boolean isReviewed = false;

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
    public WrongAnswerNote(
            User learner,
            QuizAttempt attempt,
            QuizQuestion question,
            String noteContent,
            Boolean isReviewed,
            Boolean isDeleted
    ) {
        this.learner = learner;
        this.attempt = attempt;
        this.question = question;
        this.noteContent = noteContent;
        this.isReviewed = isReviewed == null ? false : isReviewed;
        this.isDeleted = isDeleted == null ? false : isDeleted;
    }

    // 오답 노트 내용을 수정한다.
    public void updateNote(String noteContent) {
        this.noteContent = noteContent;
    }

    // 복습 완료 상태로 전환한다.
    public void markReviewed() {
        this.isReviewed = true;
    }

    // 오답 노트를 soft delete 처리한다.
    public void delete() {
        this.isDeleted = true;
    }
}
