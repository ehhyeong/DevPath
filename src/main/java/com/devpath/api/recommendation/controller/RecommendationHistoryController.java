package com.devpath.api.recommendation.controller;

import com.devpath.api.recommendation.dto.RecommendationHistoryResponse;
import com.devpath.api.recommendation.service.RecommendationHistoryService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Learner - Recommendation History", description = "기존 추천 상태 전이 이력 조회 API")
@RestController
@RequestMapping("/api/recommendations/history")
@RequiredArgsConstructor
public class RecommendationHistoryController {

    private final RecommendationHistoryService recommendationHistoryService;

    @Operation(
        summary = "Get existing recommendation histories",
        description = "Returns existing recommendation histories by recommendation id or roadmap node id."
    )
    @GetMapping
    public ResponseEntity<ApiResponse<RecommendationHistoryResponse.ListResult>> getHistories(
        @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
        @Parameter(description = "Recommendation id", example = "10") @RequestParam(required = false) Long recommendationId,
        @Parameter(description = "Roadmap node id", example = "100") @RequestParam(required = false) Long nodeId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            recommendationHistoryService.getHistories(userId, recommendationId, nodeId)
        ));
    }
}
