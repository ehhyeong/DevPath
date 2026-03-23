package com.devpath.domain.qna.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "qna_question_templates")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class QuestionTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "question_template_id")
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "template_type", nullable = false, unique = true, length = 50)
    private QuestionTemplateType templateType;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String description;

    @Column(name = "guide_example", columnDefinition = "TEXT")
    private String guideExample;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @Column(name = "is_active", nullable = false)
    private boolean isActive;

    @Column(name = "created_at", updatable = false, nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Builder
    public QuestionTemplate(
            QuestionTemplateType templateType,
            String name,
            String description,
            String guideExample,
            int sortOrder,
            boolean isActive
    ) {
        this.templateType = templateType;
        this.name = name;
        this.description = description;
        this.guideExample = guideExample;
        this.sortOrder = sortOrder;
        this.isActive = isActive;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }
}
