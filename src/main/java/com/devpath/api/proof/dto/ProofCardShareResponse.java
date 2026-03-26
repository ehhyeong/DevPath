package com.devpath.api.proof.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

// Proof Card Share 응답 DTO 모음
public class ProofCardShareResponse {

    // 공유 링크 응답 DTO
    @Getter
    @Builder
    @Schema(description = "Proof Card 공유 링크 응답 DTO")
    public static class Detail {

        // 공유 토큰
        @Schema(description = "공유 토큰", example = "proof-share-token-123")
        private String shareToken;

        // 공유 URL
        @Schema(description = "공유 URL", example = "https://devpath.app/proof-card-shares/proof-share-token-123")
        private String shareUrl;
    }
}
