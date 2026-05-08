package com.devpath.api.dashboard.controller;

import static com.devpath.common.security.AuthenticationUtils.requireUserId;

import com.devpath.api.dashboard.dto.DashboardGrowthRecommendationResponse;
import com.devpath.api.dashboard.dto.DashboardMentoringResponse;
import com.devpath.api.dashboard.dto.DashboardStudyGroupResponse;
import com.devpath.api.dashboard.dto.DashboardSummaryResponse;
import com.devpath.api.dashboard.dto.HeatmapResponse;
import com.devpath.api.dashboard.service.LearnerDashboardService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/me/dashboard")
@RequiredArgsConstructor
@Tag(name = "학습자 - 대시보드", description = "학습자 대시보드 API")
public class LearnerDashboardController {

  private final LearnerDashboardService dashboardService;

  @GetMapping("/summary")
  @Operation(summary = "대시보드 요약 조회", description = "로그인한 학습자의 대시보드 요약 정보를 조회합니다.")
  public ApiResponse<DashboardSummaryResponse> getSummary(
      @Parameter(hidden = true) @AuthenticationPrincipal Long learnerId) {
    return ApiResponse.ok(dashboardService.getSummary(requireUserId(learnerId)));
  }

  @GetMapping("/heatmap")
  @Operation(summary = "학습 히트맵 조회", description = "로그인한 학습자의 학습 히트맵 데이터를 조회합니다.")
  public ApiResponse<List<HeatmapResponse>> getHeatmap(
      @Parameter(hidden = true) @AuthenticationPrincipal Long learnerId) {
    return ApiResponse.ok(dashboardService.getHeatmap(requireUserId(learnerId)));
  }

  @GetMapping("/study-group")
  @Operation(summary = "대시보드 스터디 그룹 조회", description = "로그인한 학습자의 스터디 그룹 요약 정보를 조회합니다.")
  public ApiResponse<DashboardStudyGroupResponse> getDashboardStudyGroup(
      @Parameter(hidden = true) @AuthenticationPrincipal Long learnerId) {
    return ApiResponse.ok(dashboardService.getDashboardStudyGroup(requireUserId(learnerId)));
  }

  @GetMapping("/mentoring")
  @Operation(summary = "대시보드 멘토링 요약 조회", description = "로그인한 학습자가 참여한 프로젝트의 멘토링 요약 정보를 조회합니다.")
  public ApiResponse<DashboardMentoringResponse> getDashboardMentoring(
      @Parameter(hidden = true) @AuthenticationPrincipal Long learnerId) {
    return ApiResponse.ok(dashboardService.getDashboardMentoring(requireUserId(learnerId)));
  }

  @GetMapping("/growth-recommendation")
  @Operation(summary = "AI 성장 추천 조회", description = "학습자의 Proof Card 태그를 기반으로 AI 성장 추천을 조회합니다.")
  public ApiResponse<DashboardGrowthRecommendationResponse> getGrowthRecommendation(
      @Parameter(hidden = true) @AuthenticationPrincipal Long learnerId) {
    return ApiResponse.ok(dashboardService.getGrowthRecommendation(requireUserId(learnerId)));
  }
}
