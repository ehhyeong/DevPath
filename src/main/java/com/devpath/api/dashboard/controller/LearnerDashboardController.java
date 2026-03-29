package com.devpath.api.dashboard.controller;

import com.devpath.api.dashboard.dto.DashboardSummaryResponse;
import com.devpath.api.dashboard.dto.HeatmapResponse;
import com.devpath.api.dashboard.service.LearnerDashboardService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/me/dashboard")
@RequiredArgsConstructor
@Tag(name = "Learner Dashboard", description = "학습자 대시보드 API")
public class LearnerDashboardController {

    private final LearnerDashboardService dashboardService;

    @GetMapping("/summary")
    @Operation(summary = "대시보드 요약 조회", description = "학습 시간, 완료 노드 수, 스트릭 등의 요약 정보를 조회합니다.")
    public ApiResponse<DashboardSummaryResponse> getSummary(@RequestParam(defaultValue = "1") Long learnerId) {
        return ApiResponse.ok(dashboardService.getSummary(learnerId));
    }

    @GetMapping("/heatmap")
    @Operation(summary = "학습 히트맵 조회", description = "최근 학습 활동에 대한 히트맵 데이터를 조회합니다.")
    public ApiResponse<List<HeatmapResponse>> getHeatmap(@RequestParam(defaultValue = "1") Long learnerId) {
        return ApiResponse.ok(dashboardService.getHeatmap(learnerId));
    }

    // 누락되었던 API 추가
    @GetMapping("/study-group")
    @Operation(summary = "내 스터디 그룹 요약", description = "대시보드에서 내가 속한 스터디 그룹 정보를 조회합니다.")
    public ApiResponse<Object> getDashboardStudyGroup(@RequestParam(defaultValue = "1") Long learnerId) {
        return ApiResponse.ok(dashboardService.getDashboardStudyGroup(learnerId));
    }
}