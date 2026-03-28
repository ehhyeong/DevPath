package com.devpath.api.proof.controller;

import com.devpath.api.proof.dto.ProofCardRequest;
import com.devpath.api.proof.dto.ProofCardResponse;
import com.devpath.api.proof.service.ProofCardService;
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

// Proof Card API 컨트롤러
@Tag(name = "Learner - Proof Card", description = "학습자 Proof Card API")
@RestController
@RequestMapping("/api/me/proof-cards")
@RequiredArgsConstructor
public class ProofCardController {

    // Proof Card 서비스
    private final ProofCardService proofCardService;

    // Proof Card를 발급한다.
    @Operation(summary = "Proof Card 발급", description = "특정 노드 기준으로 Proof Card를 발급합니다.")
    @PostMapping("/issue")
    public ResponseEntity<ApiResponse<ProofCardResponse.Detail>> issue(
        @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
        @Valid @RequestBody ProofCardRequest.Issue request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(proofCardService.issue(userId, request)));
    }

    // Proof Card 목록을 조회한다.
    @Operation(summary = "Proof Card 목록 조회", description = "내 Proof Card 목록을 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<List<ProofCardResponse.Summary>>> getProofCards(
        @Parameter(hidden = true) @AuthenticationPrincipal Long userId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(proofCardService.getProofCards(userId)));
    }

    // Proof Card 상세를 조회한다.
    @Operation(summary = "Proof Card 상세 조회", description = "특정 Proof Card 상세를 조회합니다.")
    @GetMapping("/{proofCardId}")
    public ResponseEntity<ApiResponse<ProofCardResponse.Detail>> getProofCard(
        @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
        @Parameter(description = "Proof Card ID", example = "1") @PathVariable Long proofCardId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(proofCardService.getProofCard(userId, proofCardId)));
    }

    // Proof Card 갤러리를 조회한다.
    @Operation(summary = "Proof Card 갤러리 조회", description = "내 Proof Card 갤러리를 조회합니다.")
    @GetMapping("/gallery")
    public ResponseEntity<ApiResponse<List<ProofCardResponse.GalleryItem>>> getGallery(
        @Parameter(hidden = true) @AuthenticationPrincipal Long userId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(proofCardService.getGallery(userId)));
    }
}
