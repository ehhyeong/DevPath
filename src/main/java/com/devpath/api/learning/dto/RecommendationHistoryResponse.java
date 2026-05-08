package com.devpath.api.learning.dto;

import com.devpath.domain.learning.entity.recommendation.RecommendationHistory;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@Schema(description = "추천 변경 이력 응답 DTO")
public class RecommendationHistoryResponse {

  @Schema(description = "이력 ID", example = "1")
  private Long historyId;

  @Schema(description = "추천 ID", example = "10")
  private Long recommendationId;

  @Schema(description = "로드맵 노드 ID", example = "23")
  private Long nodeId;

  @Schema(description = "로드맵 노드 제목", example = "Spring Security")
  private String nodeTitle;

  @Schema(description = "변경 전 상태", example = "PENDING", nullable = true)
  private String beforeStatus;

  @Schema(description = "변경 후 상태", example = "APPROVED")
  private String afterStatus;

  @Schema(description = "액션 타입", example = "APPROVED")
  private String actionType;

  @Schema(description = "변경 문맥", example = "학습 진행 데이터 기반 자동 추천")
  private String context;

  @Schema(description = "생성 시각", example = "2026-03-23T11:20:00")
  private LocalDateTime createdAt;

  public static RecommendationHistoryResponse from(RecommendationHistory history) {
    return RecommendationHistoryResponse.builder()
        .historyId(history.getId())
        .recommendationId(history.getRecommendationId())
        .nodeId(history.getRoadmapNode() != null ? history.getRoadmapNode().getNodeId() : null)
        .nodeTitle(history.getRoadmapNode() != null ? history.getRoadmapNode().getTitle() : null)
        .beforeStatus(history.getBeforeStatus())
        .afterStatus(history.getAfterStatus())
        .actionType(history.getActionType())
        .context(history.getContext())
        .createdAt(history.getCreatedAt())
        .build();
  }
}
