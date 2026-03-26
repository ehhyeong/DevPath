package com.devpath.api.analytics.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

// Instructor Learning Analytics 응답 DTO 모음
public class InstructorLearningAnalyticsResponse {

    // 개요 응답 DTO
    @Getter
    @Builder
    @Schema(description = "강의 학습 분석 개요 응답 DTO")
    public static class Overview {

        // 강의 ID
        @Schema(description = "강의 ID", example = "1")
        private Long courseId;

        // 수강생 수
        @Schema(description = "수강생 수", example = "120")
        private Long studentCount;
    }
}
