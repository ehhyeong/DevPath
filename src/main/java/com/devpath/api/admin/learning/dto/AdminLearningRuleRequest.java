package com.devpath.api.admin.learning.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.NoArgsConstructor;

// Admin Learning Rule 요청 DTO 모음
public class AdminLearningRuleRequest {

    // 학습 자동화 룰 생성/수정 요청 DTO
    @Getter
    @NoArgsConstructor
    @Schema(description = "학습 자동화 룰 생성/수정 요청 DTO")
    public static class Upsert {

        // 룰 이름
        @Schema(description = "룰 이름", example = "노드 클리어 자동 판정 룰")
        private String ruleName;

        // 룰 설명
        @Schema(description = "룰 설명", example = "레슨 진도율, 퀴즈, 과제 조건을 기준으로 노드를 판정합니다.")
        private String description;
    }
}
