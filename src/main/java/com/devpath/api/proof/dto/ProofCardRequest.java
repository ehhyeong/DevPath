package com.devpath.api.proof.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.NoArgsConstructor;

// Proof Card 요청 DTO 모음
public class ProofCardRequest {

    // Proof Card 발급 요청 DTO
    @Getter
    @NoArgsConstructor
    @Schema(description = "Proof Card 발급 요청 DTO")
    public static class Issue {

        // 로드맵 노드 ID
        @Schema(description = "로드맵 노드 ID", example = "10")
        private Long nodeId;
    }
}
