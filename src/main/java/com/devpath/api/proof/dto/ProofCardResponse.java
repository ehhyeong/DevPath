package com.devpath.api.proof.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

// Proof Card 응답 DTO 모음
public class ProofCardResponse {

    // Proof Card 상세 응답 DTO
    @Getter
    @Builder
    @Schema(description = "Proof Card 상세 응답 DTO")
    public static class Detail {

        // Proof Card ID
        @Schema(description = "Proof Card ID", example = "1")
        private Long proofCardId;

        // 카드 제목
        @Schema(description = "카드 제목", example = "Spring Boot 인증 플로우 완주")
        private String title;
    }
}
