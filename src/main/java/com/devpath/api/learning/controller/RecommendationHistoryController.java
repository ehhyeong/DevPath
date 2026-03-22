package com.devpath.api.learning.controller;

import com.devpath.api.learning.dto.RecommendationHistoryResponse;
import com.devpath.api.learning.service.RecommendationHistoryService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@Tag(name = "추천 이력", description = "학습자 보강 노드 추천 상태 변경 이력 조회 API")
@RestController
@RequestMapping("/api/learning/recommendation-histories")
@RequiredArgsConstructor
public class RecommendationHistoryController {

    private final RecommendationHistoryService recommendationHistoryService;

    @Operation(summary = "추천 이력 조회", description = "학습자의 보강 노드 추천 상태 변경 이력을 최신순으로 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<List<RecommendationHistoryResponse>>> getHistories(
            @AuthenticationPrincipal Long userId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(recommendationHistoryService.getHistories(userId)));
    }
}
