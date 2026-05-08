package com.devpath.api.recommendation.dto;

import com.devpath.domain.roadmap.entity.NodeRecommendation;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

public class NodeRecommendationDto {

  @Getter
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  @Schema(description = "Recommendation item")
  public static class RecommendationResponse {
    @Schema(description = "Recommendation ID")
    private Long recommendationId;

    @Schema(description = "Recommended node ID")
    private Long nodeId;

    @Schema(description = "Recommended node title")
    private String nodeTitle;

    @Schema(description = "Recommendation type", example = "REMEDIAL")
    private String recommendationType;

    @Schema(description = "Recommendation reason")
    private String reason;

    @Schema(description = "Priority")
    private Integer priority;

    @Schema(description = "Status", example = "PENDING")
    private String status;

    @Schema(description = "Created at")
    private LocalDateTime createdAt;

    @Schema(description = "Expires at")
    private LocalDateTime expiresAt;

    @Schema(description = "Expired flag")
    private Boolean isExpired;

    public static RecommendationResponse from(NodeRecommendation recommendation) {
      return RecommendationResponse.builder()
          .recommendationId(recommendation.getRecommendationId())
          .nodeId(recommendation.getRecommendedNode().getNodeId())
          .nodeTitle(recommendation.getRecommendedNode().getTitle())
          .recommendationType(recommendation.getRecommendationType().name())
          .reason(recommendation.getReason())
          .priority(recommendation.getPriority())
          .status(recommendation.getStatus().name())
          .createdAt(recommendation.getCreatedAt())
          .expiresAt(recommendation.getExpiresAt())
          .isExpired(recommendation.isExpired())
          .build();
    }
  }

  @Getter
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  @Schema(description = "Roadmap recommendation list response")
  public static class RoadmapRecommendationsResponse {
    @Schema(description = "Roadmap ID")
    private Long roadmapId;

    @Schema(description = "Roadmap title")
    private String roadmapTitle;

    @Schema(description = "Total recommendation count")
    private Integer totalRecommendations;

    @Schema(description = "Pending recommendation count")
    private Integer pendingCount;

    @Schema(description = "Accepted recommendation count")
    private Integer acceptedCount;

    @Schema(description = "Rejected recommendation count")
    private Integer rejectedCount;

    @Schema(description = "Recommendations")
    private List<RecommendationResponse> recommendations;
  }

  @Getter
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  @Schema(description = "Recommendation generation response")
  public static class GenerateRecommendationsResponse {
    @Schema(description = "Roadmap ID")
    private Long roadmapId;

    @Schema(description = "Generated recommendation count")
    private Integer generatedCount;

    @Schema(description = "Generated recommendations")
    private List<RecommendationResponse> recommendations;

    public static GenerateRecommendationsResponse from(
        Long roadmapId, List<NodeRecommendation> recommendations) {
      return GenerateRecommendationsResponse.builder()
          .roadmapId(roadmapId)
          .generatedCount(recommendations.size())
          .recommendations(
              recommendations.stream()
                  .map(RecommendationResponse::from)
                  .collect(Collectors.toList()))
          .build();
    }
  }

  @Getter
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  @Schema(description = "Recommendation process response")
  public static class ProcessRecommendationResponse {
    @Schema(description = "Recommendation ID")
    private Long recommendationId;

    @Schema(description = "Status", example = "ACCEPTED")
    private String status;

    @Schema(description = "Node ID")
    private Long nodeId;

    @Schema(description = "Node title")
    private String nodeTitle;

    @Schema(description = "Message")
    private String message;

    public static ProcessRecommendationResponse from(
        NodeRecommendation recommendation, String message) {
      return ProcessRecommendationResponse.builder()
          .recommendationId(recommendation.getRecommendationId())
          .status(recommendation.getStatus().name())
          .nodeId(recommendation.getRecommendedNode().getNodeId())
          .nodeTitle(recommendation.getRecommendedNode().getTitle())
          .message(message)
          .build();
    }
  }
}
