package com.devpath.api.evaluation.dto.request;

import com.devpath.domain.learning.entity.SubmissionType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Schema(description = "강사용 과제 생성 및 제출 규칙 설정 요청 DTO")
public class CreateAssignmentRequest {

  // Evaluation Swagger 문서화 기준에 맞춘 과제 생성 요청 DTO다.
  @NotNull
  @Schema(description = "과제를 연결할 로드맵 노드 ID", example = "1")
  private Long roadmapNodeId;

  @NotBlank
  @Schema(description = "과제 제목", example = "JWT 로그인 API 구현")
  private String title;

  @NotBlank
  @Schema(description = "과제 설명", example = "Spring Security와 JWT를 사용한 로그인 API를 구현하세요.")
  private String description;

  @NotNull
  @Schema(description = "허용할 제출 유형", example = "MULTIPLE")
  private SubmissionType submissionType;

  @Schema(description = "과제 마감 일시", example = "2026-03-27T23:59:59")
  private LocalDateTime dueAt;

  @Schema(description = "허용 파일 형식 목록을 쉼표로 구분한 값", example = "zip,pdf,md")
  private String allowedFileFormats;

  @Schema(description = "README 제출을 필수로 요구할지 여부", example = "true")
  private Boolean readmeRequired;

  @Schema(description = "테스트 통과를 필수로 요구할지 여부", example = "true")
  private Boolean testRequired;

  @Schema(description = "린트 통과를 필수로 요구할지 여부", example = "true")
  private Boolean lintRequired;

  @Schema(description = "학습자에게 보여줄 제출 규칙 설명", example = "README에 실행 방법과 검증 결과를 반드시 포함하세요.")
  private String submissionRuleDescription;

  @NotNull
  @Min(0)
  @Schema(description = "과제 총점", example = "100")
  private Integer totalScore;

  @Schema(description = "생성 직후 과제를 공개할지 여부", example = "false")
  private Boolean isPublished;

  @Schema(description = "생성 직후 과제를 활성 상태로 둘지 여부", example = "true")
  private Boolean isActive;

  @Schema(description = "마감 이후 지각 제출을 허용할지 여부", example = "false")
  private Boolean allowLateSubmission;

  @Builder
  public CreateAssignmentRequest(
      Long roadmapNodeId,
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
      Boolean allowLateSubmission) {
    this.roadmapNodeId = roadmapNodeId;
    this.title = title;
    this.description = description;
    this.submissionType = submissionType;
    this.dueAt = dueAt;
    this.allowedFileFormats = allowedFileFormats;
    this.readmeRequired = readmeRequired;
    this.testRequired = testRequired;
    this.lintRequired = lintRequired;
    this.submissionRuleDescription = submissionRuleDescription;
    this.totalScore = totalScore;
    this.isPublished = isPublished;
    this.isActive = isActive;
    this.allowLateSubmission = allowLateSubmission;
  }
}
