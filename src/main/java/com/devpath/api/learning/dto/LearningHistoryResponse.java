package com.devpath.api.learning.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

// Learning History 응답 DTO 모음
public class LearningHistoryResponse {

    // 학습 이력 요약 응답 DTO
    @Getter
    @Builder
    @Schema(description = "학습 이력 요약 응답 DTO")
    public static class Summary {

        // 완료 노드 수
        @Schema(description = "완료 노드 수", example = "8")
        private Long completedNodeCount;

        // 발급된 Proof Card 수
        @Schema(description = "발급된 Proof Card 수", example = "3")
        private Long proofCardCount;
    }
}
