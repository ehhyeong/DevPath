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
@Table(name = "assignments")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Assignment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "assignment_id")
    private Long id;

    // 현재 과제가 어떤 로드맵 노드에 연결되는지 나타내는 연관관계다.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "node_id", nullable = false)
    private RoadmapNode roadmapNode;

    // 과제 제목으로 목록 조회나 상세 조회에서 식별용으로 사용된다.
    @Column(nullable = false, length = 200)
    private String title;

    // 과제 설명으로 요구사항이나 문제 설명을 담는다.
    @Column(columnDefinition = "TEXT", nullable = false)
    private String description;

    // 텍스트, 파일, URL 등 어떤 제출 타입을 허용하는지 나타낸다.
    @Enumerated(EnumType.STRING)
    @Column(name = "submission_type", nullable = false, length = 30)
    private SubmissionType submissionType;

    // 과제 마감 일시이며 지각 제출 판단 기준이 된다.
    @Column(name = "due_at")
    private LocalDateTime dueAt;

    // 허용 파일 형식을 쉼표 구분 문자열로 저장한다.
    @Column(name = "allowed_file_formats", length = 300)
    private String allowedFileFormats;

    // README 파일 또는 README 내용 제출이 필수인지 여부를 저장한다.
    @Column(name = "readme_required", nullable = false)
    private Boolean readmeRequired = false;

    // 테스트 코드 또는 테스트 실행 결과가 필수인지 여부를 저장한다.
    @Column(name = "test_required", nullable = false)
    private Boolean testRequired = false;

    // 린트 통과 결과가 필수인지 여부를 저장한다.
    @Column(name = "lint_required", nullable = false)
    private Boolean lintRequired = false;

    // 제출 규칙 전체 설명을 텍스트로 저장한다.
    @Column(name = "submission_rule_description", columnDefinition = "TEXT")
    private String submissionRuleDescription;

    // 과제의 총 배점을 저장한다.
    @Column(name = "total_score", nullable = false)
    private Integer totalScore;

    // 과제가 학습자에게 공개된 상태인지 여부를 저장한다.
    @Column(name = "is_published", nullable = false)
    private Boolean isPublished = false;

    // 과제가 현재 활성 상태인지 여부를 저장한다.
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    // 마감 후에도 지각 제출을 허용할지 여부를 저장한다.
    @Column(name = "allow_late_submission", nullable = false)
    private Boolean allowLateSubmission = false;

    // 실제 삭제 대신 논리 삭제를 적용하기 위한 플래그다.
    @Column(name = "is_deleted", nullable = false)
    private Boolean isDeleted = false;

    // 한 과제는 여러 루브릭 항목을 가질 수 있으며 과제 삭제 시 루브릭도 함께 정리된다.
    @OneToMany(mappedBy = "assignment", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Rubric> rubrics = new ArrayList<>();

    // 생성 시각을 자동 저장한다.
    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    // 수정 시각을 자동 갱신한다.
    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Builder
    public Assignment(
            RoadmapNode roadmapNode,
            String title,
            String description,
            SubmissionType submissionType,
            LocalDateTime dueAt,
            String allowedFileFormats,
            Boolean readmeRequired,
            Boolean testRequired,
            Boolean lintRequired,
            String submissionRuleDescription,
            Integer totalScore,
            Boolean isPublished,
            Boolean isActive,
            Boolean allowLateSubmission,
            Boolean isDeleted,
            List<Rubric> rubrics
    ) {
        this.roadmapNode = roadmapNode;
        this.title = title;
        this.description = description;
        this.submissionType = submissionType == null ? SubmissionType.MULTIPLE : submissionType;
        this.dueAt = dueAt;
        this.allowedFileFormats = allowedFileFormats;
        this.readmeRequired = readmeRequired == null ? false : readmeRequired;
        this.testRequired = testRequired == null ? false : testRequired;
        this.lintRequired = lintRequired == null ? false : lintRequired;
        this.submissionRuleDescription = submissionRuleDescription;
        this.totalScore = totalScore == null ? 0 : totalScore;
        this.isPublished = isPublished == null ? false : isPublished;
        this.isActive = isActive == null ? true : isActive;
        this.allowLateSubmission = allowLateSubmission == null ? false : allowLateSubmission;
        this.isDeleted = isDeleted == null ? false : isDeleted;
        this.rubrics = new ArrayList<>();

        if (rubrics != null) {
            rubrics.forEach(this::addRubric);
        }
    }

    // 과제의 핵심 정보인 제목, 설명, 제출 유형, 마감일, 총점을 한 번에 수정한다.
    public void updateInfo(
            String title,
            String description,
            SubmissionType submissionType,
            LocalDateTime dueAt,
            Integer totalScore
    ) {
        this.title = title;
        this.description = description;
        this.submissionType = submissionType;
        this.dueAt = dueAt;
        this.totalScore = totalScore;
    }

    // 파일 형식, README, 테스트, 린트, 규칙 설명, 지각 제출 허용 여부까지 제출 정책을 한 번에 갱신한다.
    public void updateSubmissionRule(
            String allowedFileFormats,
            Boolean readmeRequired,
            Boolean testRequired,
            Boolean lintRequired,
            String submissionRuleDescription,
            Boolean allowLateSubmission
    ) {
        this.allowedFileFormats = allowedFileFormats;
        this.readmeRequired = readmeRequired;
        this.testRequired = testRequired;
        this.lintRequired = lintRequired;
        this.submissionRuleDescription = submissionRuleDescription;
        this.allowLateSubmission = allowLateSubmission;
    }

    // 과제를 공개 상태로 전환한다.
    public void publish() {
        this.isPublished = true;
    }

    // 과제를 비공개 상태로 전환한다.
    public void unpublish() {
        this.isPublished = false;
    }

    // 과제를 활성 상태로 전환한다.
    public void activate() {
        this.isActive = true;
    }

    // 과제를 비활성 상태로 전환한다.
    public void deactivate() {
        this.isActive = false;
    }

    // 과제를 soft delete 처리하면서 비활성 및 비공개 상태로 함께 전환한다.
    public void delete() {
        this.isDeleted = true;
        this.isActive = false;
        this.isPublished = false;
    }

    // 연관관계 편의 메서드로 루브릭을 추가하면서 양방향 참조도 같이 맞춘다.
    public void addRubric(Rubric rubric) {
        this.rubrics.add(rubric);
        rubric.assignAssignment(this);
    }
}
