package com.devpath.api.learning.dto;

import com.devpath.domain.learning.entity.recommendation.RiskWarning;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@Schema(description = "추천 리스크 경고 응답 DTO")
public class RiskWarningResponse {

  @Schema(description = "경고 ID", example = "1")
  private Long warningId;

  @Schema(description = "로드맵 노드 ID", example = "23")
  private Long nodeId;

  @Schema(description = "로드맵 노드 제목", example = "Spring Security")
  private String nodeTitle;

  @Schema(description = "경고 타입", example = "DIFFICULTY_TOO_HIGH")
  private String warningType;

  @Schema(description = "리스크 레벨", example = "HIGH")
  private String riskLevel;

  @Schema(description = "경고 메시지", example = "현재 보유 태그 대비 난도가 높아 먼저 기초 보강이 필요합니다.")
  private String message;

  @Schema(description = "확인 여부", example = "false")
  private Boolean acknowledged;

  @Schema(description = "생성 시각", example = "2026-03-23T11:25:00")
  private LocalDateTime createdAt;

  public static RiskWarningResponse from(RiskWarning riskWarning) {
    return RiskWarningResponse.builder()
        .warningId(riskWarning.getId())
        .nodeId(
            riskWarning.getRoadmapNode() != null ? riskWarning.getRoadmapNode().getNodeId() : null)
        .nodeTitle(
            riskWarning.getRoadmapNode() != null ? riskWarning.getRoadmapNode().getTitle() : null)
        .warningType(riskWarning.getWarningType())
        .riskLevel(riskWarning.getRiskLevel())
        .message(riskWarning.getMessage())
        .acknowledged(riskWarning.getIsAcknowledged())
        .createdAt(riskWarning.getCreatedAt())
        .build();
  }
}
