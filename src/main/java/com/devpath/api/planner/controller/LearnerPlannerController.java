package com.devpath.api.planner.controller;

import static com.devpath.common.security.AuthenticationUtils.requireUserId;

import com.devpath.api.planner.dto.PlannerGoalRequest;
import com.devpath.api.planner.dto.PlannerGoalResponse;
import com.devpath.api.planner.dto.WeeklyPlanRequest;
import com.devpath.api.planner.dto.WeeklyPlanResponse;
import com.devpath.api.planner.service.LearnerPlannerService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/me/planner")
@RequiredArgsConstructor
@Tag(name = "학습자 - 플래너", description = "학습자 목표 및 주간 계획 관리 API")
public class LearnerPlannerController {

  private final LearnerPlannerService learnerPlannerService;

  @PostMapping("/goals")
  @Operation(summary = "학습 목표 생성", description = "로그인한 학습자의 학습 목표를 생성합니다.")
  public ApiResponse<PlannerGoalResponse> createGoal(
      @Parameter(hidden = true) @AuthenticationPrincipal Long learnerId,
      @Valid @RequestBody PlannerGoalRequest request) {
    return ApiResponse.ok(learnerPlannerService.createGoal(requireUserId(learnerId), request));
  }

  @GetMapping("/goals")
  @Operation(summary = "내 학습 목표 조회", description = "로그인한 학습자의 학습 목표 목록을 조회합니다.")
  public ApiResponse<List<PlannerGoalResponse>> getMyGoals(
      @Parameter(hidden = true) @AuthenticationPrincipal Long learnerId) {
    return ApiResponse.ok(learnerPlannerService.getMyGoals(requireUserId(learnerId)));
  }

  @PostMapping("/weekly-plans")
  @Operation(summary = "주간 계획 생성", description = "로그인한 학습자의 주간 계획을 생성합니다.")
  public ApiResponse<WeeklyPlanResponse> createWeeklyPlan(
      @Parameter(hidden = true) @AuthenticationPrincipal Long learnerId,
      @Valid @RequestBody WeeklyPlanRequest request) {
    return ApiResponse.ok(
        learnerPlannerService.createWeeklyPlan(requireUserId(learnerId), request));
  }

  @GetMapping("/weekly-plans")
  @Operation(summary = "내 주간 계획 조회", description = "로그인한 학습자의 주간 계획 목록을 조회합니다.")
  public ApiResponse<List<WeeklyPlanResponse>> getMyWeeklyPlans(
      @Parameter(hidden = true) @AuthenticationPrincipal Long learnerId) {
    return ApiResponse.ok(learnerPlannerService.getMyWeeklyPlans(requireUserId(learnerId)));
  }

  @PutMapping("/weekly-plans/{planId}")
  @Operation(summary = "주간 계획 수정", description = "로그인한 학습자가 보유한 주간 계획을 수정합니다.")
  public ApiResponse<WeeklyPlanResponse> updateWeeklyPlan(
      @PathVariable Long planId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long learnerId,
      @Valid @RequestBody WeeklyPlanRequest request) {
    return ApiResponse.ok(
        learnerPlannerService.updateWeeklyPlan(requireUserId(learnerId), planId, request));
  }

  @PostMapping("/weekly-plans/{planId}/adjust")
  @Operation(summary = "주간 계획 조정", description = "로그인한 학습자의 주간 계획을 조정합니다.")
  public ApiResponse<WeeklyPlanResponse> adjustWeeklyPlan(
      @PathVariable Long planId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long learnerId,
      @Valid @RequestBody WeeklyPlanRequest request) {
    return ApiResponse.ok(
        learnerPlannerService.adjustWeeklyPlan(requireUserId(learnerId), planId, request));
  }
}
