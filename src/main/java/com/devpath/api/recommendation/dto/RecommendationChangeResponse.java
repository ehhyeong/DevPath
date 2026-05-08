package com.devpath.api.recommendation.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import java.util.List;
import lombok.Builder;
import lombok.Getter;

public class RecommendationChangeResponse {

  @Getter
  @Builder
  @Schema(description = "Recommendation change detail response")
  public static class Detail {

    @Schema(description = "Change id", example = "1")
    private Long changeId;

    @Schema(description = "Source recommendation id", example = "12")
    private Long sourceRecommendationId;

    @Schema(description = "Roadmap node id", example = "101")
    private Long nodeId;

    @Schema(description = "Roadmap node title", example = "Spring Security JWT authentication")
    private String nodeTitle;

    @Schema(description = "Node sort order (ADD 타입에서 삽입 위치 결정용)", example = "8")
    private Integer nodeSortOrder;

    @Schema(description = "진단 퀴즈 추천 시 클리어한 원본 노드 ID (분기 위치 결정용)")
    private Long branchFromNodeId;

    @Schema(
        description = "Reason",
        example = "Generated from supplement recommendation and weakness signals.")
    private String reason;

    @Schema(
        description = "Context summary",
        example = "tilCount=4, weaknessSignal=true, warningCount=2, historyCount=3")
    private String contextSummary;

    @Schema(description = "Change type (ADD / MODIFY / DELETE)", example = "DELETE")
    private String nodeChangeType;

    @Schema(description = "Change status", example = "SUGGESTED")
    private String changeStatus;

    @Schema(description = "Decision status", example = "UNDECIDED")
    private String decisionStatus;

    @Schema(description = "Suggested time", example = "2026-03-29T11:10:00")
    private LocalDateTime suggestedAt;

    @Schema(description = "Applied time", example = "2026-03-29T11:20:00")
    private LocalDateTime appliedAt;

    @Schema(description = "Ignored time", example = "2026-03-29T11:25:00")
    private LocalDateTime ignoredAt;
  }

  @Getter
  @Builder
  @Schema(description = "Recommendation change history item")
  public static class HistoryItem {

    @Schema(description = "Change id", example = "1")
    private Long changeId;

    @Schema(description = "Roadmap node id", example = "101")
    private Long nodeId;

    @Schema(description = "Roadmap node title", example = "Spring Security JWT authentication")
    private String nodeTitle;

    @Schema(description = "Change status", example = "APPLIED")
    private String changeStatus;

    @Schema(description = "Change type (ADD / MODIFY / DELETE)", example = "ADD")
    private String nodeChangeType;

    @Schema(description = "Decision status", example = "APPLIED")
    private String decisionStatus;

    @Schema(description = "Updated time", example = "2026-03-29T11:20:00")
    private LocalDateTime updatedAt;
  }

  @Getter
  @Builder
  @Schema(description = "Recommendation change recalculate result")
  public static class RecalculateResult {

    @Schema(description = "Recalculated item count", example = "3")
    private Integer recalculatedCount;

    @Schema(description = "Regenerated recommendation changes")
    private List<Detail> items;
  }
}
