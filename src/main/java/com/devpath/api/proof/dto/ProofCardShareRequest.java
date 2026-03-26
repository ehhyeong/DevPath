package com.devpath.api.proof.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.NoArgsConstructor;

// Proof Card Share 요청 DTO 모음
public class ProofCardShareRequest {

    // 공유 링크 생성 요청 DTO
    @Getter
    @NoArgsConstructor
    @Schema(description = "Proof Card 공유 링크 생성 요청 DTO")
    public static class Create {

        // Proof Card ID
        @Schema(description = "Proof Card ID", example = "1")
        private Long proofCardId;
    }
}
