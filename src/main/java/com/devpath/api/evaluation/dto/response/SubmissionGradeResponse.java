package com.devpath.api.evaluation.dto.response;

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
@Schema(description = "제출물 채점 결과 응답 DTO")
public class SubmissionGradeResponse {

  // Evaluation Swagger 문서화 기준에 맞춘 제출 채점 결과 응답 DTO다.
  @Schema(description = "제출 ID", example = "1")
  private Long submissionId;

  @Schema(description = "채점자 ID", example = "3")
  private Long graderId;

  @Schema(description = "최종 점수", example = "24")
  private Integer totalScore;

  @Schema(description = "채점 이후 제출 상태", example = "GRADED")
  private SubmissionStatus submissionStatus;

  @Schema(description = "채점 완료 시각", example = "2026-03-20T13:30:00")
  private LocalDateTime gradedAt;

  @Schema(description = "루브릭별 채점 결과 목록")
  private List<RubricGradeItem> rubricGrades = new ArrayList<>();

  @Builder
  public SubmissionGradeResponse(
      Long submissionId,
      Long graderId,
      Integer totalScore,
      SubmissionStatus submissionStatus,
      LocalDateTime gradedAt,
      List<RubricGradeItem> rubricGrades) {
    this.submissionId = submissionId;
    this.graderId = graderId;
    this.totalScore = totalScore;
    this.submissionStatus = submissionStatus;
    this.gradedAt = gradedAt;
    this.rubricGrades = rubricGrades == null ? new ArrayList<>() : rubricGrades;
  }

  @Getter
  @NoArgsConstructor(access = AccessLevel.PROTECTED)
  @Schema(description = "개별 루브릭 채점 결과 DTO")
  public static class RubricGradeItem {

    @Schema(description = "루브릭 ID", example = "1")
    private Long rubricId;

    @Schema(description = "루브릭 기준명", example = "기능 구현 완성도")
    private String criteriaName;

    @Schema(description = "최대 점수", example = "10")
    private Integer maxPoints;

    @Schema(description = "부여 점수", example = "8")
    private Integer earnedPoints;

    @Schema(description = "AI rubric review comment", example = "요구사항 구현이 부족합니다.")
    private String reviewComment;

    @Builder
    public RubricGradeItem(
        Long rubricId,
        String criteriaName,
        Integer maxPoints,
        Integer earnedPoints,
        String reviewComment) {
      this.rubricId = rubricId;
      this.criteriaName = criteriaName;
      this.maxPoints = maxPoints;
      this.earnedPoints = earnedPoints;
      this.reviewComment = reviewComment;
    }
  }
}
