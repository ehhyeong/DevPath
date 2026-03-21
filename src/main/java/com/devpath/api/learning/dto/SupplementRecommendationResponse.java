package com.devpath.api.learning.dto;

import com.devpath.domain.learning.entity.recommendation.RecommendationStatus;
import com.devpath.domain.learning.entity.recommendation.SupplementRecommendation;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class SupplementRecommendationResponse {

    private Long recommendationId;
    private Long nodeId;
    private String nodeTitle;
    private String reason;
    private RecommendationStatus status;
    private LocalDateTime createdAt;

    public static SupplementRecommendationResponse from(SupplementRecommendation rec) {
        return SupplementRecommendationResponse.builder()
                .recommendationId(rec.getId())
                .nodeId(rec.getRoadmapNode().getNodeId())
                .nodeTitle(rec.getRoadmapNode().getTitle())
                .reason(rec.getReason())
                .status(rec.getStatus())
                .createdAt(rec.getCreatedAt())
                .build();
    }
}
