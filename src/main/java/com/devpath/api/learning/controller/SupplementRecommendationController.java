package com.devpath.api.learning.controller;

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
import org.springframework.web.bind.annotation.*;

@Tag(name = "보강 노드 추천", description = "학습자 취약 영역 기반 보강 노드 후보 생성 및 수락/거절 API")
@RestController
@RequestMapping("/api/learning/supplement-recommendations")
@RequiredArgsConstructor
public class SupplementRecommendationController {

    private final SupplementRecommendationService supplementRecommendationService;

    @Operation(summary = "보강 노드 후보 생성", description = "특정 노드를 보강 학습 후보로 등록합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<SupplementRecommendationResponse>> createRecommendation(
            @AuthenticationPrincipal Long userId,
            @RequestParam Long nodeId,
            @RequestParam(required = false, defaultValue = "취약 영역 보강을 위해 추천된 노드입니다.") String reason
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(supplementRecommendationService.createRecommendation(userId, nodeId, reason)));
    }

    @Operation(summary = "보강 노드 추천 목록 조회", description = "학습자의 보강 노드 추천 목록을 조회합니다. status 파라미터로 PENDING/APPROVED/REJECTED 필터링 가능합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<List<SupplementRecommendationResponse>>> getRecommendations(
            @AuthenticationPrincipal Long userId,
            @RequestParam(required = false) RecommendationStatus status
    ) {
        return ResponseEntity.ok(ApiResponse.ok(supplementRecommendationService.getRecommendations(userId, status)));
    }

    @Operation(summary = "보강 노드 추천 수락", description = "학습자가 보강 노드 추천을 수락합니다.")
    @PatchMapping("/{recommendationId}/approve")
    public ResponseEntity<ApiResponse<SupplementRecommendationResponse>> approveRecommendation(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long recommendationId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(supplementRecommendationService.approveRecommendation(userId, recommendationId)));
    }

    @Operation(summary = "보강 노드 추천 거절", description = "학습자가 보강 노드 추천을 거절합니다.")
    @PatchMapping("/{recommendationId}/reject")
    public ResponseEntity<ApiResponse<SupplementRecommendationResponse>> rejectRecommendation(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long recommendationId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(supplementRecommendationService.rejectRecommendation(userId, recommendationId)));
    }
}
