package com.devpath.domain.learning.entity;

import com.devpath.domain.roadmap.entity.RoadmapNode;
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
@Table(name = "quizzes")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Quiz {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "quiz_id")
    private Long id;

    // 현재 퀴즈가 어떤 로드맵 노드에 연결되는지 나타내는 연관관계이며 현재 레포 구조를 유지하기 위해 RoadmapNode를 그대로 사용한다.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "node_id", nullable = false)
    private RoadmapNode roadmapNode;

    // 강사가 퀴즈를 식별하기 쉽게 보여줄 제목이다.
    @Column(nullable = false, length = 200)
    private String title;

    // 퀴즈의 목적이나 안내 사항을 적는 설명이다.
    @Column(columnDefinition = "TEXT")
    private String description;

    // 수동 생성인지 AI 생성인지 같은 퀴즈 생성 방식을 구분한다.
    @Enumerated(EnumType.STRING)
    @Column(name = "quiz_type", nullable = false, length = 30)
    private QuizType quizType;

    // 퀴즈 전체 배점의 합계를 저장한다.
    @Column(name = "total_score", nullable = false)
    private Integer totalScore;

    // 프론트나 학습자에게 공개 가능한 퀴즈인지 여부를 나타낸다.
    @Column(name = "is_published", nullable = false)
    private Boolean isPublished = false;

    // 관리자 또는 강사가 비활성 처리한 퀴즈인지 여부를 나타낸다.
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    // 응시 후 정답을 노출할지 여부를 제어한다.
    @Column(name = "expose_answer", nullable = false)
    private Boolean exposeAnswer = false;

    // 응시 후 해설을 노출할지 여부를 제어한다.
    @Column(name = "expose_explanation", nullable = false)
    private Boolean exposeExplanation = false;

    // 실제 삭제 대신 논리 삭제를 적용하기 위한 플래그다.
    @Column(name = "is_deleted", nullable = false)
    private Boolean isDeleted = false;

    // 하나의 퀴즈는 여러 개의 문항을 가지며 문항 삭제 시 함께 정리되도록 cascade와 orphanRemoval을 사용한다.
    @OneToMany(mappedBy = "quiz", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<QuizQuestion> questions = new ArrayList<>();

    // 생성 시각을 자동 저장한다.
    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    // 수정 시각을 자동 갱신한다.
    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Builder
    public Quiz(
            RoadmapNode roadmapNode,
            String title,
            String description,
            QuizType quizType,
            Integer totalScore,
            Boolean isPublished,
            Boolean isActive,
            Boolean exposeAnswer,
            Boolean exposeExplanation,
            Boolean isDeleted,
            List<QuizQuestion> questions
    ) {
        this.roadmapNode = roadmapNode;
        this.title = title;
        this.description = description;
        this.quizType = quizType == null ? QuizType.MANUAL : quizType;
        this.totalScore = totalScore == null ? 0 : totalScore;
        this.isPublished = isPublished == null ? false : isPublished;
        this.isActive = isActive == null ? true : isActive;
        this.exposeAnswer = exposeAnswer == null ? false : exposeAnswer;
        this.exposeExplanation = exposeExplanation == null ? false : exposeExplanation;
        this.isDeleted = isDeleted == null ? false : isDeleted;
        this.questions = new ArrayList<>();

        if (questions != null) {
            questions.forEach(this::addQuestion);
        }
    }

    // 제목, 설명, 유형, 총점을 한 번에 수정하는 비즈니스 메서드다.
    public void updateInfo(String title, String description, QuizType quizType, Integer totalScore) {
        this.title = title;
        this.description = description;
        this.quizType = quizType;
        this.totalScore = totalScore;
    }

    // 퀴즈를 공개 상태로 전환한다.
    public void publish() {
        this.isPublished = true;
    }

    // 퀴즈를 비공개 상태로 전환한다.
    public void unpublish() {
        this.isPublished = false;
    }

    // 퀴즈를 활성 상태로 전환한다.
    public void activate() {
        this.isActive = true;
    }

    // 퀴즈를 비활성 상태로 전환한다.
    public void deactivate() {
        this.isActive = false;
    }

    // 응시 후 정답과 해설 노출 정책을 함께 변경한다.
    public void updateExposePolicy(Boolean exposeAnswer, Boolean exposeExplanation) {
        this.exposeAnswer = exposeAnswer;
        this.exposeExplanation = exposeExplanation;
    }

    // 퀴즈를 soft delete 처리하면서 비활성 및 비공개 상태로 함께 전환한다.
    public void delete() {
        this.isDeleted = true;
        this.isActive = false;
        this.isPublished = false;
    }

    // 연관관계 편의 메서드로 문항을 추가하면서 양방향 참조도 같이 맞춘다.
    public void addQuestion(QuizQuestion question) {
        this.questions.add(question);
        question.assignQuiz(this);
    }
}
