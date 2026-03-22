package com.devpath.api.recommendation.controller;

import com.devpath.api.recommendation.dto.RiskWarningResponse;
import com.devpath.api.recommendation.service.RiskWarningService;
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

@Tag(name = "추천 리스크 경고", description = "추천 난이도 및 리스크 경고 조회 API")
@RestController
@RequestMapping("/api/recommendations/risk-warnings")
@RequiredArgsConstructor
public class RiskWarningController {

    private final RiskWarningService riskWarningService;

    @Operation(summary = "리스크 경고 조회", description = "미확인 경고만 조회하거나 특정 노드 기준으로 리스크 경고를 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<RiskWarningResponse.ListResult>> getWarnings(
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
            @Parameter(description = "미확인 경고만 조회 여부", example = "true")
            @RequestParam(defaultValue = "false") Boolean onlyUnacknowledged,
            @Parameter(description = "노드 ID", example = "100")
            @RequestParam(required = false) Long nodeId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                riskWarningService.getWarnings(userId, onlyUnacknowledged, nodeId)
        ));
    }
}
