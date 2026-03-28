package com.devpath.api.proof.controller;

import com.devpath.api.proof.dto.ProofCardShareRequest;
import com.devpath.api.proof.dto.ProofCardShareResponse;
import com.devpath.api.proof.service.ProofCardShareService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// Proof Card Share API 컨트롤러
@Tag(name = "Learner - Proof Card Share", description = "Proof Card 공유 API")
@RestController
@RequestMapping("/api/proof-card-shares")
@RequiredArgsConstructor
public class ProofCardShareController {

    // Proof Card Share 서비스
    private final ProofCardShareService proofCardShareService;

    // 공유 링크를 생성한다.
    @Operation(summary = "Proof Card 공유 링크 생성", description = "특정 Proof Card의 공유 링크를 생성합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<ProofCardShareResponse.Detail>> create(
        @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
        @Valid @RequestBody ProofCardShareRequest.Create request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(proofCardShareService.create(userId, request)));
    }

    // 공유 토큰으로 Proof Card를 조회한다.
    @Operation(summary = "공유 링크 조회", description = "공유 토큰으로 공개된 Proof Card를 조회합니다.")
    @GetMapping("/{shareToken}")
    public ResponseEntity<ApiResponse<ProofCardShareResponse.PublicDetail>> getSharedProofCard(
        @Parameter(description = "공유 토큰", example = "proof-share-token-123") @PathVariable String shareToken
    ) {
        return ResponseEntity.ok(ApiResponse.ok(proofCardShareService.getSharedProofCard(shareToken)));
    }
}
