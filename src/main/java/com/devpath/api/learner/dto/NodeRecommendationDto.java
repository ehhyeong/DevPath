package com.devpath.api.learner.dto;

import com.devpath.domain.roadmap.entity.NodeRecommendation;
import com.devpath.domain.roadmap.entity.RecommendationStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

public class NodeRecommendationDto {

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "노드 추천 응답")
    public static class RecommendationResponse {
        @Schema(description = "추천 ID")
        private Long recommendationId;

        @Schema(description = "추천된 노드 ID")
        private Long nodeId;

        @Schema(description = "노드 제목")
        private String nodeTitle;

        @Schema(description = "추천 타입", example = "REMEDIAL")
        private String recommendationType;

        @Schema(description = "추천 사유")
        private String reason;

        @Schema(description = "우선순위 (낮을수록 중요)")
        private Integer priority;

        @Schema(description = "추천 상태", example = "PENDING")
        private String status;

        @Schema(description = "생성일시")
        private LocalDateTime createdAt;

        @Schema(description = "만료일시")
        private LocalDateTime expiresAt;

        @Schema(description = "만료 여부")
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
    @Schema(description = "로드맵 전체 추천 목록 응답")
    public static class RoadmapRecommendationsResponse {
        @Schema(description = "로드맵 ID")
        private Long roadmapId;

        @Schema(description = "로드맵 제목")
        private String roadmapTitle;

        @Schema(description = "전체 추천 수")
        private Integer totalRecommendations;

        @Schema(description = "PENDING 상태 추천 수")
        private Integer pendingCount;

        @Schema(description = "ACCEPTED 상태 추천 수")
        private Integer acceptedCount;

        @Schema(description = "REJECTED 상태 추천 수")
        private Integer rejectedCount;

        @Schema(description = "추천 목록")
        private List<RecommendationResponse> recommendations;
    }

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "추천 생성 응답")
    public static class GenerateRecommendationsResponse {
        @Schema(description = "로드맵 ID")
        private Long roadmapId;

        @Schema(description = "생성된 추천 수")
        private Integer generatedCount;

        @Schema(description = "생성된 추천 목록")
        private List<RecommendationResponse> recommendations;

        public static GenerateRecommendationsResponse from(Long roadmapId, List<NodeRecommendation> recommendations) {
            return GenerateRecommendationsResponse.builder()
                    .roadmapId(roadmapId)
                    .generatedCount(recommendations.size())
                    .recommendations(
                            recommendations.stream()
                                    .map(RecommendationResponse::from)
                                    .collect(Collectors.toList())
                    )
                    .build();
        }
    }

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "추천 처리 응답")
    public static class ProcessRecommendationResponse {
        @Schema(description = "추천 ID")
        private Long recommendationId;

        @Schema(description = "처리 후 상태", example = "ACCEPTED")
        private String status;

        @Schema(description = "노드 ID")
        private Long nodeId;

        @Schema(description = "노드 제목")
        private String nodeTitle;

        @Schema(description = "처리 메시지")
        private String message;

        public static ProcessRecommendationResponse from(NodeRecommendation recommendation, String message) {
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
