package com.devpath.api.learning.controller;

import com.devpath.api.learning.dto.WeaknessAnalysisResponse;
import com.devpath.api.learning.service.WeaknessAnalysisService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Learner - Weakness Analysis", description = "진단 퀴즈 기반 취약점 분석 결과 조회 API")
@RestController
@RequestMapping("/api/learning/weakness-analysis")
@RequiredArgsConstructor
public class WeaknessAnalysisController {

    private final WeaknessAnalysisService weaknessAnalysisService;

    @Operation(
        summary = "Get weakness analysis by result id",
        description = "Returns weak tags and recommended nodes for a diagnosis result."
    )
    @GetMapping("/results/{resultId}")
    public ResponseEntity<ApiResponse<WeaknessAnalysisResponse>> getAnalysisByResultId(
        @AuthenticationPrincipal Long userId,
        @PathVariable Long resultId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            weaknessAnalysisService.getAnalysisByResultId(userId, resultId)
        ));
    }

    @Operation(
        summary = "Get latest weakness analysis for roadmap",
        description = "Returns the latest weakness analysis for a roadmap."
    )
    @GetMapping("/roadmaps/{roadmapId}/latest")
    public ResponseEntity<ApiResponse<WeaknessAnalysisResponse>> getLatestAnalysis(
        @AuthenticationPrincipal Long userId,
        @PathVariable Long roadmapId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            weaknessAnalysisService.getLatestAnalysis(userId, roadmapId)
        ));
    }
}
