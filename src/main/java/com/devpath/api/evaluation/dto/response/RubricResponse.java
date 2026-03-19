package com.devpath.api.evaluation.dto.response;

import com.devpath.domain.learning.entity.Rubric;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Schema(description = "강사용 루브릭 응답 DTO")
public class RubricResponse {

  // 루브릭 ID다.
  private Long rubricId;

  // 연결된 과제 ID다.
  private Long assignmentId;

  // 기준명이다.
  private String criteriaName;

  // 기준 설명이다.
  private String criteriaDescription;

  // 최대 배점이다.
  private Integer maxPoints;

  // 표시 순서다.
  private Integer displayOrder;

  // 생성 시각이다.
  private LocalDateTime createdAt;

  @Builder
  public RubricResponse(
      Long rubricId,
      Long assignmentId,
      String criteriaName,
      String criteriaDescription,
      Integer maxPoints,
      Integer displayOrder,
      LocalDateTime createdAt) {
    this.rubricId = rubricId;
    this.assignmentId = assignmentId;
    this.criteriaName = criteriaName;
    this.criteriaDescription = criteriaDescription;
    this.maxPoints = maxPoints;
    this.displayOrder = displayOrder;
    this.createdAt = createdAt;
  }

  // Rubric 엔티티를 응답 DTO로 변환한다.
  public static RubricResponse from(Rubric rubric) {
    return RubricResponse.builder()
        .rubricId(rubric.getId())
        .assignmentId(rubric.getAssignment().getId())
        .criteriaName(rubric.getCriteriaName())
        .criteriaDescription(rubric.getCriteriaDescription())
        .maxPoints(rubric.getMaxPoints())
        .displayOrder(rubric.getDisplayOrder())
        .createdAt(rubric.getCreatedAt())
        .build();
  }
}
