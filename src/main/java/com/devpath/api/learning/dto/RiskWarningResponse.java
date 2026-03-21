package com.devpath.api.learning.dto;

import com.devpath.domain.learning.entity.recommendation.RiskWarning;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class RiskWarningResponse {

    private Long warningId;
    private Long nodeId;
    private String nodeTitle;
    private String warningType;
    private String message;
    private Boolean isAcknowledged;
    private LocalDateTime createdAt;

    public static RiskWarningResponse from(RiskWarning warning) {
        return RiskWarningResponse.builder()
                .warningId(warning.getId())
                .nodeId(warning.getRoadmapNode() != null ? warning.getRoadmapNode().getNodeId() : null)
                .nodeTitle(warning.getRoadmapNode() != null ? warning.getRoadmapNode().getTitle() : null)
                .warningType(warning.getWarningType())
                .message(warning.getMessage())
                .isAcknowledged(warning.getIsAcknowledged())
                .createdAt(warning.getCreatedAt())
                .build();
    }
}
