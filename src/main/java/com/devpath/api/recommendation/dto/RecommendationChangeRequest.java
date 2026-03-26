package com.devpath.api.recommendation.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.NoArgsConstructor;

// Recommendation Change 요청 DTO 모음
public class RecommendationChangeRequest {

    // 추천 변경 제안 생성 요청 DTO
    @Getter
    @NoArgsConstructor
    @Schema(description = "추천 변경 제안 생성 요청 DTO")
    public static class Suggestion {

        // 로드맵 ID
        @Schema(description = "로드맵 ID", example = "1")
        private Long roadmapId;
    }
}
