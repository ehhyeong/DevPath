package com.devpath.api.evaluation.dto.response;

import com.devpath.domain.learning.entity.Submission;
import com.devpath.domain.learning.entity.SubmissionStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Schema(description = "학습자 제출 이력 조회 응답 DTO")
public class SubmissionHistoryResponse {

    // 조회한 학습자 ID다.
    @Schema(description = "학습자 ID", example = "1")
    private Long learnerId;

    // 제출 이력 개수다.
    @Schema(description = "총 제출 개수", example = "3")
    private Integer totalCount;

    // 제출 이력 목록이다.
    @Schema(description = "제출 이력 목록")
    private List<HistoryItem> submissions = new ArrayList<>();

    @Builder
    public SubmissionHistoryResponse(Long learnerId, Integer totalCount, List<HistoryItem> submissions) {
        this.learnerId = learnerId;
        this.totalCount = totalCount;
        this.submissions = submissions == null ? new ArrayList<>() : submissions;
    }

    // 제출 엔티티 리스트를 제출 이력 응답으로 변환한다.
    public static SubmissionHistoryResponse of(Long learnerId, List<Submission> submissionList) {
        List<HistoryItem> items = submissionList.stream()
                .map(HistoryItem::from)
                .toList();

        return SubmissionHistoryResponse.builder()
                .learnerId(learnerId)
                .totalCount(items.size())
                .submissions(items)
                .build();
    }

    @Getter
    @NoArgsConstructor(access = AccessLevel.PROTECTED)
    @Schema(description = "개별 제출 이력 항목")
    public static class HistoryItem {

        // 제출 ID다.
        @Schema(description = "제출 ID", example = "1")
        private Long submissionId;

        // 과제 ID다.
        @Schema(description = "과제 ID", example = "10")
        private Long assignmentId;

        // 과제 제목이다.
        @Schema(description = "과제 제목", example = "Spring Security 실습 과제")
        private String assignmentTitle;

        // 제출 상태다.
        @Schema(description = "제출 상태", example = "SUBMITTED")
        private SubmissionStatus submissionStatus;

        // 품질 점수다.
        @Schema(description = "품질 점수", example = "95")
        private Integer qualityScore;

        // 최종 점수다.
        @Schema(description = "최종 점수", example = "88")
        private Integer totalScore;

        // 지각 제출 여부다.
        @Schema(description = "지각 제출 여부", example = "false")
        private Boolean isLate;

        // 제출 시각이다.
        @Schema(description = "제출 시각", example = "2026-03-20T12:00:00")
        private LocalDateTime submittedAt;

        @Builder
        public HistoryItem(
                Long submissionId,
                Long assignmentId,
                String assignmentTitle,
                SubmissionStatus submissionStatus,
                Integer qualityScore,
                Integer totalScore,
                Boolean isLate,
                LocalDateTime submittedAt
        ) {
            this.submissionId = submissionId;
            this.assignmentId = assignmentId;
            this.assignmentTitle = assignmentTitle;
            this.submissionStatus = submissionStatus;
            this.qualityScore = qualityScore;
            this.totalScore = totalScore;
            this.isLate = isLate;
            this.submittedAt = submittedAt;
        }

        // 제출 엔티티를 개별 제출 이력 항목 DTO로 변환한다.
        public static HistoryItem from(Submission submission) {
            return HistoryItem.builder()
                    .submissionId(submission.getId())
                    .assignmentId(submission.getAssignment().getId())
                    .assignmentTitle(submission.getAssignment().getTitle())
                    .submissionStatus(submission.getSubmissionStatus())
                    .qualityScore(submission.getQualityScore())
                    .totalScore(submission.getTotalScore())
                    .isLate(submission.getIsLate())
                    .submittedAt(submission.getSubmittedAt())
                    .build();
        }
    }
}
