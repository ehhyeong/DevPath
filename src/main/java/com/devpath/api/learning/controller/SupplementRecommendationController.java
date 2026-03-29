package com.devpath.api.learning.controller;

import com.devpath.api.learning.dto.RecommendationHistoryResponse;
import com.devpath.api.learning.dto.RiskWarningResponse;
import com.devpath.api.learning.dto.SupplementRecommendationResponse;
import com.devpath.api.learning.service.SupplementRecommendationService;
import com.devpath.common.response.ApiResponse;
import com.devpath.domain.learning.entity.recommendation.RecommendationStatus;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Learner - Supplement Recommendation", description = "보강 추천 후보 생성 및 상태 관리 API")
@RestController
@RequestMapping("/api/learning/supplement-recommendations")
@RequiredArgsConstructor
public class SupplementRecommendationController {

    private final SupplementRecommendationService supplementRecommendationService;

    @Operation(
        summary = "Create supplement recommendation",
        description = "Creates supplement recommendation candidates manually or automatically."
    )
    @PostMapping
    public ResponseEntity<ApiResponse<SupplementRecommendationResponse>> createRecommendation(
        @AuthenticationPrincipal Long userId,
        @RequestParam(required = false) Long nodeId,
        @RequestParam(required = false) String reason
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.ok(supplementRecommendationService.createRecommendation(userId, nodeId, reason)));
    }

    @Operation(summary = "Get supplement recommendations", description = "Returns supplement recommendations with status filtering.")
    @GetMapping
    public ResponseEntity<ApiResponse<List<SupplementRecommendationResponse>>> getRecommendations(
        @AuthenticationPrincipal Long userId,
        @RequestParam(required = false) RecommendationStatus status
    ) {
        return ResponseEntity.ok(ApiResponse.ok(supplementRecommendationService.getRecommendations(userId, status)));
    }

    @Operation(summary = "Approve supplement recommendation", description = "Approves a supplement recommendation.")
    @PatchMapping("/{recommendationId}/approve")
    public ResponseEntity<ApiResponse<SupplementRecommendationResponse>> approveRecommendation(
        @AuthenticationPrincipal Long userId,
        @PathVariable Long recommendationId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            supplementRecommendationService.approveRecommendation(userId, recommendationId)
        ));
    }

    @Operation(summary = "Reject supplement recommendation", description = "Rejects a supplement recommendation.")
    @PatchMapping("/{recommendationId}/reject")
    public ResponseEntity<ApiResponse<SupplementRecommendationResponse>> rejectRecommendation(
        @AuthenticationPrincipal Long userId,
        @PathVariable Long recommendationId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            supplementRecommendationService.rejectRecommendation(userId, recommendationId)
        ));
    }

    @Operation(
        summary = "Get existing recommendation histories",
        description = "Returns recommendation histories filtered by recommendation id or node id."
    )
    @GetMapping("/histories")
    public ResponseEntity<ApiResponse<List<RecommendationHistoryResponse>>> getRecommendationHistories(
        @AuthenticationPrincipal Long userId,
        @RequestParam(required = false) Long recommendationId,
        @RequestParam(required = false) Long nodeId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            supplementRecommendationService.getRecommendationHistories(userId, recommendationId, nodeId)
        ));
    }

    @Operation(
        summary = "Get existing risk warnings",
        description = "Returns existing risk warnings with optional unacknowledged and node filters."
    )
    @GetMapping("/risk-warnings")
    public ResponseEntity<ApiResponse<List<RiskWarningResponse>>> getRiskWarnings(
        @AuthenticationPrincipal Long userId,
        @RequestParam(required = false) Boolean unacknowledgedOnly,
        @RequestParam(required = false) Long nodeId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            supplementRecommendationService.getRiskWarnings(userId, unacknowledgedOnly, nodeId)
        ));
    }
}
