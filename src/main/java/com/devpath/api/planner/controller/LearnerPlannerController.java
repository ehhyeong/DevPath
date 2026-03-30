package com.devpath.api.planner.controller;

import com.devpath.api.planner.dto.PlannerGoalRequest;
import com.devpath.api.planner.dto.PlannerGoalResponse;
import com.devpath.api.planner.dto.WeeklyPlanRequest;
import com.devpath.api.planner.dto.WeeklyPlanResponse;
import com.devpath.api.planner.service.LearnerPlannerService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/me/planner")
@RequiredArgsConstructor
@Tag(name = "Learner - Planner", description = "학습 플래너 및 목표 관리 API")
public class LearnerPlannerController {

    private final LearnerPlannerService learnerPlannerService;

    @PostMapping("/goals")
    @Operation(summary = "학습 목표 설정", description = "AI 학습 플래너용 주간/월간 목표를 설정합니다.")
    public ApiResponse<PlannerGoalResponse> createGoal(
            @RequestParam(defaultValue = "1") Long learnerId,
            @Valid @RequestBody PlannerGoalRequest request
    ) {
        return ApiResponse.ok(learnerPlannerService.createGoal(learnerId, request));
    }

    @GetMapping("/goals")
    @Operation(summary = "내 학습 목표 조회")
    public ApiResponse<List<PlannerGoalResponse>> getMyGoals(@RequestParam(defaultValue = "1") Long learnerId) {
        return ApiResponse.ok(learnerPlannerService.getMyGoals(learnerId));
    }

    @PostMapping("/weekly-plans")
    @Operation(summary = "주간 플랜 생성")
    public ApiResponse<WeeklyPlanResponse> createWeeklyPlan(
            @RequestParam(defaultValue = "1") Long learnerId,
            @Valid @RequestBody WeeklyPlanRequest request
    ) {
        return ApiResponse.ok(learnerPlannerService.createWeeklyPlan(learnerId, request));
    }

    @GetMapping("/weekly-plans")
    @Operation(summary = "내 주간 플랜 목록 조회")
    public ApiResponse<List<WeeklyPlanResponse>> getMyWeeklyPlans(@RequestParam(defaultValue = "1") Long learnerId) {
        return ApiResponse.ok(learnerPlannerService.getMyWeeklyPlans(learnerId));
    }

    @PutMapping("/weekly-plans/{planId}")
    @Operation(summary = "주간 플랜 수정")
    public ApiResponse<WeeklyPlanResponse> updateWeeklyPlan(
            @PathVariable Long planId,
            @RequestParam(defaultValue = "1") Long learnerId,
            @Valid @RequestBody WeeklyPlanRequest request
    ) {
        return ApiResponse.ok(learnerPlannerService.updateWeeklyPlan(learnerId, planId, request));
    }

    @PostMapping("/weekly-plans/{planId}/adjust")
    @Operation(summary = "주간 플랜 조정", description = "학습 지연 시 AI가 제안한 내용으로 플랜을 재조정합니다.")
    public ApiResponse<WeeklyPlanResponse> adjustWeeklyPlan(
            @PathVariable Long planId,
            @RequestParam(defaultValue = "1") Long learnerId,
            @Valid @RequestBody WeeklyPlanRequest request
    ) {
        return ApiResponse.ok(learnerPlannerService.adjustWeeklyPlan(learnerId, planId, request));
    }
}
