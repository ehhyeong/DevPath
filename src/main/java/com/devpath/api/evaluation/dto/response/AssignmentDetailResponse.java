package com.devpath.api.evaluation.dto.response;

import com.devpath.domain.learning.entity.Assignment;
import com.devpath.domain.learning.entity.SubmissionType;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Schema(description = "강사용 과제 상세 응답 DTO")
public class AssignmentDetailResponse {

  // 과제 ID다.
  private Long assignmentId;

  // 연결된 로드맵 노드 ID다.
  private Long roadmapNodeId;

  // 과제 제목이다.
  private String title;

  // 과제 설명이다.
  private String description;

  // 제출 유형이다.
  private SubmissionType submissionType;

  // 마감 일시다.
  private LocalDateTime dueAt;

  // 허용 파일 형식이다.
  private String allowedFileFormats;

  // README 필수 여부다.
  private Boolean readmeRequired;

  // 테스트 필수 여부다.
  private Boolean testRequired;

  // 린트 필수 여부다.
  private Boolean lintRequired;

  // 제출 규칙 설명이다.
  private String submissionRuleDescription;

  // 총점이다.
  private Integer totalScore;

  // 공개 여부다.
  private Boolean isPublished;

  // 활성 여부다.
  private Boolean isActive;

  // 지각 제출 허용 여부다.
  private Boolean allowLateSubmission;

  // 생성 시각이다.
  private LocalDateTime createdAt;

  @Builder
  public AssignmentDetailResponse(
      Long assignmentId,
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
      Boolean allowLateSubmission,
      LocalDateTime createdAt) {
    this.assignmentId = assignmentId;
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
    this.createdAt = createdAt;
  }

  // Assignment 엔티티를 응답 DTO로 변환한다.
  public static AssignmentDetailResponse from(Assignment assignment) {
    return AssignmentDetailResponse.builder()
        .assignmentId(assignment.getId())
        .roadmapNodeId(assignment.getRoadmapNode().getNodeId())
        .title(assignment.getTitle())
        .description(assignment.getDescription())
        .submissionType(assignment.getSubmissionType())
        .dueAt(assignment.getDueAt())
        .allowedFileFormats(assignment.getAllowedFileFormats())
        .readmeRequired(assignment.getReadmeRequired())
        .testRequired(assignment.getTestRequired())
        .lintRequired(assignment.getLintRequired())
        .submissionRuleDescription(assignment.getSubmissionRuleDescription())
        .totalScore(assignment.getTotalScore())
        .isPublished(assignment.getIsPublished())
        .isActive(assignment.getIsActive())
        .allowLateSubmission(assignment.getAllowLateSubmission())
        .createdAt(assignment.getCreatedAt())
        .build();
  }
}
