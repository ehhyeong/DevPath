package com.devpath.api.instructor.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

@Entity
@Table(name = "qna_answer_draft")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
@EntityListeners(AuditingEntityListener.class)
public class QnaAnswerDraft {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long questionId;

    @Column(nullable = false)
    private Long instructorId;

    @Column(columnDefinition = "TEXT")
    private String draftContent;

    @Builder.Default
    private Boolean isDeleted = false;

    @CreatedDate
    private LocalDateTime savedAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    // 같은 질문의 draft는 덮어쓰기 방식으로 유지한다.
    public void updateDraft(String content) {
        this.draftContent = content;
    }

    // draft가 published answer로 승격되면 active draft는 soft delete 처리한다.
    public void deleteDraft() {
        this.isDeleted = true;
    }
}
