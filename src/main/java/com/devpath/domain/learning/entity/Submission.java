package com.devpath.domain.learning.entity;

import com.devpath.domain.user.entity.User;
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
@Table(name = "assignment_submissions")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Submission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "submission_id")
    private Long id;

    // 어떤 과제에 대한 제출인지 나타낸다.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assignment_id", nullable = false)
    private Assignment assignment;

    // 제출한 학습자를 현재 레포 구조상 User 엔티티로 참조한다.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "learner_id", nullable = false)
    private User learner;

    // 채점한 사용자를 현재 레포 구조상 User 엔티티로 참조하며 채점 전에는 null일 수 있다.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "grader_id")
    private User grader;

    // 텍스트형 제출 내용을 저장한다.
    @Column(name = "submission_text", columnDefinition = "TEXT")
    private String submissionText;

    // URL형 제출 내용을 저장한다.
    @Column(name = "submission_url", length = 500)
    private String submissionUrl;

    // 마감 이후 제출되었는지 여부를 저장한다.
    @Column(name = "is_late", nullable = false)
    private Boolean isLate = false;

    // precheck, 제출, 채점 등의 현재 제출 상태를 저장한다.
    @Enumerated(EnumType.STRING)
    @Column(name = "submission_status", nullable = false, length = 30)
    private SubmissionStatus submissionStatus;

    // 실제 제출 완료 시각을 저장한다.
    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    // 채점 완료 시각을 저장한다.
    @Column(name = "graded_at")
    private LocalDateTime gradedAt;

    // README 요구사항을 충족했는지 저장한다.
    @Column(name = "readme_passed")
    private Boolean readmePassed;

    // 테스트 요구사항을 충족했는지 저장한다.
    @Column(name = "test_passed")
    private Boolean testPassed;

    // 린트 요구사항을 충족했는지 저장한다.
    @Column(name = "lint_passed")
    private Boolean lintPassed;

    // 허용 파일 형식을 만족하는지 저장한다.
    @Column(name = "file_format_passed")
    private Boolean fileFormatPassed;

    // 자동검증 단계에서 계산한 품질 점수를 저장한다.
    @Column(name = "quality_score")
    private Integer qualityScore;

    // 최종 채점 점수를 저장한다.
    @Column(name = "total_score")
    private Integer totalScore;

    // 개별 학습자에게 남기는 개인 피드백을 저장한다.
    @Column(name = "individual_feedback", columnDefinition = "TEXT")
    private String individualFeedback;

    // 여러 제출에 공통으로 사용할 수 있는 공통 피드백을 저장한다.
    @Column(name = "common_feedback", columnDefinition = "TEXT")
    private String commonFeedback;

    // 하나의 제출은 여러 파일을 가질 수 있으며 제출 삭제 시 파일도 함께 정리된다.
    @OneToMany(mappedBy = "submission", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<SubmissionFile> files = new ArrayList<>();

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
    public Submission(
            Assignment assignment,
            User learner,
            User grader,
            String submissionText,
            String submissionUrl,
            Boolean isLate,
            SubmissionStatus submissionStatus,
            LocalDateTime submittedAt,
            LocalDateTime gradedAt,
            Boolean readmePassed,
            Boolean testPassed,
            Boolean lintPassed,
            Boolean fileFormatPassed,
            Integer qualityScore,
            Integer totalScore,
            String individualFeedback,
            String commonFeedback,
            List<SubmissionFile> files,
            Boolean isDeleted
    ) {
        this.assignment = assignment;
        this.learner = learner;
        this.grader = grader;
        this.submissionText = submissionText;
        this.submissionUrl = submissionUrl;
        this.isLate = isLate == null ? false : isLate;
        this.submissionStatus = submissionStatus == null ? SubmissionStatus.PRECHECK_PENDING : submissionStatus;
        this.submittedAt = submittedAt;
        this.gradedAt = gradedAt;
        this.readmePassed = readmePassed;
        this.testPassed = testPassed;
        this.lintPassed = lintPassed;
        this.fileFormatPassed = fileFormatPassed;
        this.qualityScore = qualityScore;
        this.totalScore = totalScore;
        this.individualFeedback = individualFeedback;
        this.commonFeedback = commonFeedback;
        this.files = new ArrayList<>();
        this.isDeleted = isDeleted == null ? false : isDeleted;

        if (files != null) {
            files.forEach(this::addFile);
        }
    }

    // README, 테스트, 린트, 파일 형식 검증 결과와 품질 점수를 반영하고 통과 여부에 따라 precheck 상태를 갱신한다.
    public void applyPrecheckResult(
            boolean readmePassed,
            boolean testPassed,
            boolean lintPassed,
            boolean fileFormatPassed,
            int qualityScore
    ) {
        this.readmePassed = readmePassed;
        this.testPassed = testPassed;
        this.lintPassed = lintPassed;
        this.fileFormatPassed = fileFormatPassed;
        this.qualityScore = qualityScore;

        boolean passed = readmePassed && testPassed && lintPassed && fileFormatPassed;
        this.submissionStatus = passed ? SubmissionStatus.PRECHECK_PASSED : SubmissionStatus.PRECHECK_FAILED;
    }

    // 실제 제출을 완료 처리하면서 지각 여부와 제출 시각과 상태를 함께 갱신한다.
    public void submit(boolean isLate) {
        this.isLate = isLate;
        this.submittedAt = LocalDateTime.now();
        this.submissionStatus = SubmissionStatus.SUBMITTED;
    }

    // 채점을 시작할 때 채점자를 지정하고 상태를 GRADING으로 변경한다.
    public void startGrading(User grader) {
        this.grader = grader;
        this.submissionStatus = SubmissionStatus.GRADING;
    }

    // 채점 완료 시 채점자, 점수, 개별 피드백, 공통 피드백, 채점 완료 시각을 저장하고 상태를 GRADED로 변경한다.
    public void grade(User grader, int totalScore, String individualFeedback, String commonFeedback) {
        this.grader = grader;
        this.totalScore = totalScore;
        this.individualFeedback = individualFeedback;
        this.commonFeedback = commonFeedback;
        this.gradedAt = LocalDateTime.now();
        this.submissionStatus = SubmissionStatus.GRADED;
    }

    // 연관관계 편의 메서드로 제출 파일을 추가하면서 양방향 참조도 같이 맞춘다.
    public void addFile(SubmissionFile file) {
        this.files.add(file);
        file.assignSubmission(this);
    }

    // 제출을 soft delete 처리한다.
    public void delete() {
        this.isDeleted = true;
    }
}
