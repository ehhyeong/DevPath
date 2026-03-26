package com.devpath.api.admin.learning.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

// Admin Learning Metric 응답 DTO 모음
public class AdminLearningMetricResponse {

    // 학습 지표 응답 DTO
    @Getter
    @Builder
    @Schema(description = "학습 지표 응답 DTO")
    public static class Detail {

        // 지표 이름
        @Schema(description = "지표 이름", example = "clearanceRate")
        private String metricName;

        // 지표 값
        @Schema(description = "지표 값", example = "87.5")
        private Double metricValue;
    }
}
