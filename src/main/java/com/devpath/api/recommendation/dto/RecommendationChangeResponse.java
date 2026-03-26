package com.devpath.api.recommendation.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

// Recommendation Change 응답 DTO 모음
public class RecommendationChangeResponse {

    // 추천 변경 응답 DTO
    @Getter
    @Builder
    @Schema(description = "추천 변경 응답 DTO")
    public static class Detail {

        // 추천 변경 ID
        @Schema(description = "추천 변경 ID", example = "1")
        private Long changeId;

        // 추천 변경 상태
        @Schema(description = "추천 변경 상태", example = "PENDING")
        private String status;
    }
}
