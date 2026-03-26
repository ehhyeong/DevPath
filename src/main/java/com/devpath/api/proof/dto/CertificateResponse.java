package com.devpath.api.proof.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

// Certificate 응답 DTO 모음
public class CertificateResponse {

    // 증명서 상세 응답 DTO
    @Getter
    @Builder
    @Schema(description = "증명서 상세 응답 DTO")
    public static class Detail {

        // 증명서 ID
        @Schema(description = "증명서 ID", example = "1")
        private Long certificateId;

        // 증명서 번호
        @Schema(description = "증명서 번호", example = "CERT-2026-0001")
        private String certificateNumber;
    }
}
