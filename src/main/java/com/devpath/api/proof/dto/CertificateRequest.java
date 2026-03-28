package com.devpath.api.proof.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.NoArgsConstructor;

// Certificate 요청 DTO 모음
public class CertificateRequest {

    // 증명서 다운로드 요청 DTO
    @Getter
    @NoArgsConstructor
    @Schema(description = "증명서 다운로드 요청 DTO")
    public static class Download {

        // 다운로드 사유
        @Schema(description = "다운로드 사유", example = "포트폴리오 제출")
        private String reason;
    }
}
