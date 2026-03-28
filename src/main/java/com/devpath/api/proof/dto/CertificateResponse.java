package com.devpath.api.proof.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
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

        // Proof Card ID
        @Schema(description = "Proof Card ID", example = "1")
        private Long proofCardId;

        // 증명서 번호
        @Schema(description = "증명서 번호", example = "CERT-20260327-AB12CD34")
        private String certificateNumber;

        // 증명서 상태
        @Schema(description = "증명서 상태", example = "PDF_READY")
        private String status;

        // 발급 시각
        @Schema(description = "발급 시각", example = "2026-03-27T14:30:00")
        private LocalDateTime issuedAt;

        // PDF 생성 시각
        @Schema(description = "PDF 생성 시각", example = "2026-03-27T14:31:00")
        private LocalDateTime pdfGeneratedAt;

        // 마지막 다운로드 시각
        @Schema(description = "마지막 다운로드 시각", example = "2026-03-27T14:32:00")
        private LocalDateTime lastDownloadedAt;
    }

    // 증명서 PDF 응답 DTO
    @Getter
    @Builder
    @Schema(description = "증명서 PDF 응답 DTO")
    public static class PdfDetail {

        // 증명서 ID
        @Schema(description = "증명서 ID", example = "1")
        private Long certificateId;

        // 파일명
        @Schema(description = "파일명", example = "certificate-CERT-20260327-AB12CD34.pdf")
        private String fileName;

        // MIME 타입
        @Schema(description = "MIME 타입", example = "application/pdf")
        private String mimeType;

        // Base64 인코딩된 PDF 본문
        @Schema(description = "Base64 인코딩된 PDF 본문")
        private String base64Content;
    }

    // 증명서 다운로드 이력 응답 DTO
    @Getter
    @Builder
    @Schema(description = "증명서 다운로드 이력 응답 DTO")
    public static class DownloadHistoryDetail {

        // 다운로드 이력 ID
        @Schema(description = "다운로드 이력 ID", example = "1")
        private Long downloadHistoryId;

        // 다운로드 사유
        @Schema(description = "다운로드 사유", example = "포트폴리오 제출")
        private String downloadReason;

        // 다운로드 시각
        @Schema(description = "다운로드 시각", example = "2026-03-27T14:32:00")
        private LocalDateTime downloadedAt;
    }
}
