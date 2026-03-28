package com.devpath.api.proof.controller;

import com.devpath.api.proof.dto.CertificateRequest;
import com.devpath.api.proof.dto.CertificateResponse;
import com.devpath.api.proof.service.CertificateService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// Certificate API 컨트롤러
@Tag(name = "Learner - Certificate", description = "학습자 증명서 API")
@RestController
@RequestMapping("/api/certificates")
@RequiredArgsConstructor
public class CertificateController {

    // Certificate 서비스
    private final CertificateService certificateService;

    // Proof Card 기준 증명서를 발급한다.
    @Operation(summary = "증명서 발급", description = "Proof Card 기준으로 증명서를 발급합니다.")
    @PostMapping("/proof-cards/{proofCardId}")
    public ResponseEntity<ApiResponse<CertificateResponse.Detail>> issue(
        @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
        @Parameter(description = "Proof Card ID", example = "1") @PathVariable Long proofCardId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(certificateService.issue(userId, proofCardId)));
    }

    // 증명서 PDF를 생성한다.
    @Operation(summary = "증명서 PDF 생성", description = "Proof Card 기준으로 증명서 PDF를 생성합니다.")
    @PostMapping("/proof-cards/{proofCardId}/pdf")
    public ResponseEntity<ApiResponse<CertificateResponse.PdfDetail>> generatePdf(
        @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
        @Parameter(description = "Proof Card ID", example = "1") @PathVariable Long proofCardId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(certificateService.generatePdf(userId, proofCardId)));
    }

    // 증명서 상세를 조회한다.
    @Operation(summary = "증명서 상세 조회", description = "특정 증명서 상세를 조회합니다.")
    @GetMapping("/{certificateId}")
    public ResponseEntity<ApiResponse<CertificateResponse.Detail>> getCertificate(
        @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
        @Parameter(description = "Certificate ID", example = "1") @PathVariable Long certificateId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(certificateService.getCertificate(userId, certificateId)));
    }

    // 증명서 다운로드 이력을 저장한다.
    @Operation(summary = "증명서 다운로드 이력 저장", description = "증명서 다운로드 이력을 저장합니다.")
    @PostMapping("/{certificateId}/downloads")
    public ResponseEntity<ApiResponse<CertificateResponse.DownloadHistoryDetail>> recordDownload(
        @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
        @Parameter(description = "Certificate ID", example = "1") @PathVariable Long certificateId,
        @Valid @RequestBody CertificateRequest.Download request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(certificateService.recordDownload(userId, certificateId, request)));
    }

    // 증명서 다운로드 이력을 조회한다.
    @Operation(summary = "증명서 다운로드 이력 조회", description = "증명서 다운로드 이력을 조회합니다.")
    @GetMapping("/{certificateId}/download-histories")
    public ResponseEntity<ApiResponse<List<CertificateResponse.DownloadHistoryDetail>>> getDownloadHistories(
        @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
        @Parameter(description = "Certificate ID", example = "1") @PathVariable Long certificateId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(certificateService.getDownloadHistories(userId, certificateId)));
    }
}
