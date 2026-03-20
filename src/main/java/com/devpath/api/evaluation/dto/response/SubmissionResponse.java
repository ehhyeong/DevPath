package com.devpath.api.evaluation.dto.response;

import com.devpath.domain.learning.entity.Submission;
import com.devpath.domain.learning.entity.SubmissionStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Schema(description = "과제 제출 응답 DTO")
public class SubmissionResponse {

    // 제출 ID다.
    @Schema(description = "제출 ID", example = "1")
    private Long submissionId;

    // 과제 ID다.
    @Schema(description = "과제 ID", example = "10")
    private Long assignmentId;

    // 학습자 ID다.
    @Schema(description = "학습자 ID", example = "1")
    private Long learnerId;

    // 현재 제출 상태다.
    @Schema(description = "제출 상태", example = "SUBMITTED")
    private SubmissionStatus submissionStatus;

    // 지각 제출 여부다.
    @Schema(description = "지각 제출 여부", example = "false")
    private Boolean isLate;

    // 제출 시각이다.
    @Schema(description = "제출 시각", example = "2026-03-20T12:00:00")
    private LocalDateTime submittedAt;

    // 자동검증 품질 점수다.
    @Schema(description = "품질 점수", example = "100")
    private Integer qualityScore;

    // 최종 점수이며 아직 미채점이면 null일 수 있다.
    @Schema(description = "최종 점수", example = "85")
    private Integer totalScore;

    // 첨부 파일 개수다.
    @Schema(description = "첨부 파일 개수", example = "2")
    private Integer fileCount;

    @Builder
    public SubmissionResponse(
            Long submissionId,
            Long assignmentId,
            Long learnerId,
            SubmissionStatus submissionStatus,
            Boolean isLate,
            LocalDateTime submittedAt,
            Integer qualityScore,
            Integer totalScore,
            Integer fileCount
    ) {
        this.submissionId = submissionId;
        this.assignmentId = assignmentId;
        this.learnerId = learnerId;
        this.submissionStatus = submissionStatus;
        this.isLate = isLate;
        this.submittedAt = submittedAt;
        this.qualityScore = qualityScore;
        this.totalScore = totalScore;
        this.fileCount = fileCount;
    }

    // 엔티티를 응답 DTO로 변환한다.
    public static SubmissionResponse from(Submission submission) {
        return SubmissionResponse.builder()
                .submissionId(submission.getId())
                .assignmentId(submission.getAssignment().getId())
                .learnerId(submission.getLearner().getId())
                .submissionStatus(submission.getSubmissionStatus())
                .isLate(submission.getIsLate())
                .submittedAt(submission.getSubmittedAt())
                .qualityScore(submission.getQualityScore())
                .totalScore(submission.getTotalScore())
                .fileCount(submission.getFiles() == null ? 0 : submission.getFiles().size())
                .build();
    }
}
