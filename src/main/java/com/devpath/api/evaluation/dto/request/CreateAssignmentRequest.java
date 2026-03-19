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
@Schema(description = "강사용 과제 생성 및 제출 규칙 저장 요청 DTO")
public class CreateAssignmentRequest {

  // 어떤 로드맵 노드에 과제를 연결할지 식별하는 노드 ID다.
  @NotNull
  @Schema(description = "로드맵 노드 ID", example = "1")
  private Long roadmapNodeId;

  // 과제 제목이다.
  @NotBlank
  @Schema(description = "과제 제목", example = "JWT 로그인 API 구현")
  private String title;

  // 과제 설명 또는 요구사항이다.
  @NotBlank
  @Schema(description = "과제 설명", example = "Spring Security와 JWT를 사용해 로그인 API를 구현하세요.")
  private String description;

  // 텍스트, 파일, URL 중 어떤 제출 방식을 허용할지 지정한다.
  @NotNull
  @Schema(description = "제출 유형", example = "MULTIPLE")
  private SubmissionType submissionType;

  // 과제 마감 일시다.
  @Schema(description = "마감 일시", example = "2026-03-27T23:59:59")
  private LocalDateTime dueAt;

  // 허용 파일 형식을 쉼표 구분 문자열로 저장한다.
  @Schema(description = "허용 파일 형식", example = "zip,pdf,md")
  private String allowedFileFormats;

  // README 제출이 필수인지 여부다.
  @Schema(description = "README 필수 여부", example = "true")
  private Boolean readmeRequired;

  // 테스트 통과가 필수인지 여부다.
  @Schema(description = "테스트 필수 여부", example = "true")
  private Boolean testRequired;

  // 린트 통과가 필수인지 여부다.
  @Schema(description = "린트 필수 여부", example = "true")
  private Boolean lintRequired;

  // 제출 규칙 설명이다.
  @Schema(description = "제출 규칙 설명", example = "README에 실행 방법과 검증 결과를 반드시 포함하세요.")
  private String submissionRuleDescription;

  // 과제 총점이다.
  @NotNull
  @Min(0)
  @Schema(description = "과제 총점", example = "100")
  private Integer totalScore;

  // 생성 직후 공개할지 여부다.
  @Schema(description = "공개 여부", example = "false")
  private Boolean isPublished;

  // 생성 직후 활성 상태로 둘지 여부다.
  @Schema(description = "활성 여부", example = "true")
  private Boolean isActive;

  // 마감 후에도 지각 제출을 허용할지 여부다.
  @Schema(description = "지각 제출 허용 여부", example = "false")
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
