package com.devpath.api.recommendation.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

// 비동기 추천 생성 진행 상태 응답 DTO
@Getter
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Schema(description = "비동기 추천 생성 진행 상태 응답")
public class RecommendationStatusResponse {

  @Schema(description = "상태(RUNNING/DONE/FAILED/IDLE)", example = "RUNNING")
  private final String status;

  @Schema(description = "추천 생성 대상 노드 ID", example = "10")
  private final Long nodeId;

  @Schema(description = "이번에 생성된 추천 수", example = "2")
  private final int count;
}