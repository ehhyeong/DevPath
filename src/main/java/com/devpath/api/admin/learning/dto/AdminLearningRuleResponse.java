package com.devpath.api.admin.learning.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

// Admin Learning Rule 응답 DTO 모음
public class AdminLearningRuleResponse {

    // 학습 자동화 룰 응답 DTO
    @Getter
    @Builder
    @Schema(description = "학습 자동화 룰 응답 DTO")
    public static class Detail {

        // 룰 ID
        @Schema(description = "룰 ID", example = "1")
        private Long ruleId;

        // 룰 이름
        @Schema(description = "룰 이름", example = "노드 클리어 자동 판정 룰")
        private String ruleName;
    }
}
