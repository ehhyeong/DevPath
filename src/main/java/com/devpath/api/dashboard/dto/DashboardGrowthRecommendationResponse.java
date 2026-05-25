package com.devpath.api.dashboard.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Schema(description = "AI 맞춤 성장 제안 응답")
public class DashboardGrowthRecommendationResponse {

  @Schema(description = "AI 역량 분석 텍스트")
  private String analysisText;

  @Schema(description = "추천 항목 목록")
  private List<RecommendationItem> recommendations;

  @Getter
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor(access = AccessLevel.PRIVATE)
  public static class RecommendationItem {

    @Schema(description = "추천 강의명", example = "Advanced SQL & Tuning")
    private Long nodeId;

    private Long roadmapId;

    private String nodeTitle;

    private String roadmapTitle;

    private String reason;

    @Schema(description = "매칭률 상승 수치 (%)", example = "20")
    private int matchRateIncrease;

    @Schema(description = "Font Awesome 아이콘 클래스", example = "fa-database")
    private String iconClass;
  }

  @Getter
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor(access = AccessLevel.PRIVATE)
  public static class AddNodeResponse {

    private Long customRoadmapId;

    private Long customNodeId;

    private Long nodeId;

    private String nodeTitle;

    private boolean roadmapCreated;

    private boolean alreadyExists;
  }
}
