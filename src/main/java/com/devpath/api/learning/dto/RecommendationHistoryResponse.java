package com.devpath.api.learning.dto;

import com.devpath.domain.learning.entity.recommendation.RecommendationHistory;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class RecommendationHistoryResponse {

    private Long historyId;
    private String beforeStatus;
    private String afterStatus;
    private String context;
    private LocalDateTime createdAt;

    public static RecommendationHistoryResponse from(RecommendationHistory history) {
        return RecommendationHistoryResponse.builder()
                .historyId(history.getId())
                .beforeStatus(history.getBeforeStatus())
                .afterStatus(history.getAfterStatus())
                .context(history.getContext())
                .createdAt(history.getCreatedAt())
                .build();
    }
}
