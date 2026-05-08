package com.devpath.api.study.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@Schema(description = "스터디 자동 매칭 추천 응답 DTO")
public class StudyMatchRecommendationResponse {

  @Schema(description = "추천된 학습자 ID", example = "3")
  private Long recommendedLearnerId;

  @Schema(description = "추천된 학습자의 이름 (마스킹 처리)", example = "김*발")
  private String maskedName;

  @Schema(description = "현재 같이 진행 중인 노드 ID", example = "15")
  private Long sharedNodeId;

  @Schema(description = "매칭 적합도 점수 (1~100)", example = "95")
  private Integer matchScore;
}
