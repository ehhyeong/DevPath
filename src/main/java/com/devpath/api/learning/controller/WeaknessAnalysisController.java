package com.devpath.api.learning.controller;

import com.devpath.api.learning.dto.WeaknessAnalysisResponse;
import com.devpath.api.learning.service.WeaknessAnalysisService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@Tag(name = "취약점 분석", description = "진단 퀴즈 기반 취약점 분석 결과 조회 API")
@RestController
@RequestMapping("/api/learning/weakness-analysis")
@RequiredArgsConstructor
public class WeaknessAnalysisController {

    private final WeaknessAnalysisService weaknessAnalysisService;

    @Operation(summary = "진단 결과 ID로 취약점 분석 조회", description = "특정 진단 결과의 취약 태그 및 추천 노드 목록을 조회합니다.")
    @GetMapping("/results/{resultId}")
    public ResponseEntity<ApiResponse<WeaknessAnalysisResponse>> getAnalysisByResultId(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long resultId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(weaknessAnalysisService.getAnalysisByResultId(userId, resultId)));
    }

    @Operation(summary = "로드맵 최신 취약점 분석 조회", description = "특정 로드맵에 대한 가장 최근 진단 결과의 취약점 분석을 조회합니다.")
    @GetMapping("/roadmaps/{roadmapId}/latest")
    public ResponseEntity<ApiResponse<WeaknessAnalysisResponse>> getLatestAnalysis(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long roadmapId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(weaknessAnalysisService.getLatestAnalysis(userId, roadmapId)));
    }
}
