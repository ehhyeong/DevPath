package com.devpath.api.common.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@Schema(description = "Week 2 common roadmap entry response")
public class RoadmapEntryResponse {

  @Schema(description = "Roadmap ID", example = "1")
  private Long roadmapId;

  @Schema(description = "Roadmap title", example = "Backend Master Roadmap")
  private String roadmapTitle;

  @Schema(description = "Diagnosis completed", example = "true")
  private Boolean diagnosisCompleted;

  @Schema(description = "Owned skill tag names")
  private List<String> ownedSkills;

  @Schema(description = "Skipped node IDs")
  private List<Long> skippedNodeIds;

  @Schema(description = "Locked node IDs")
  private List<Long> lockedNodeIds;

  @Schema(description = "Unlocked node IDs")
  private List<Long> unlockedNodeIds;

  @Schema(description = "Recommended nodes")
  private List<RecommendedNode> recommendedNodes;

  @Schema(description = "Supplement nodes")
  private List<RecommendedNode> supplementNodes;

  @Schema(description = "Next action", nullable = true, example = "recommended_nodes_review")
  private String nextAction;

  @Schema(description = "Recommendation ID", nullable = true, example = "3001")
  private Long recommendationId;

  @Getter
  @Builder
  @Schema(description = "Recommended node summary")
  public static class RecommendedNode {

    @Schema(description = "Node ID", example = "5")
    private Long nodeId;

    @Schema(description = "Node title", example = "Security and JWT")
    private String nodeTitle;

    @Schema(description = "Recommendation reason", example = "백엔드 취업 준비에 핵심 인증 지식이 필요합니다.")
    private String reason;

    @Schema(description = "Priority", example = "HIGH")
    private String priority;
  }
}
