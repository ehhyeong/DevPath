package com.devpath.api.planner.controller;

import com.devpath.api.planner.dto.StreakResponse;
import com.devpath.api.planner.service.LearnerStreakService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/me/streaks")
@RequiredArgsConstructor
@Tag(name = "Learner Streak", description = "학습자 스트릭 관리 API")
public class LearnerStreakController {

    private final LearnerStreakService learnerStreakService;

    @GetMapping
    @Operation(summary = "현재 스트릭 조회", description = "학습자의 현재 연속 학습 일수를 조회합니다.")
    public ApiResponse<StreakResponse> getStreak(@RequestParam(defaultValue = "1") Long learnerId) {
        return ApiResponse.ok(learnerStreakService.getStreak(learnerId));
    }

    @PostMapping("/refresh")
    @Operation(summary = "스트릭 갱신", description = "학습 활동을 바탕으로 오늘자 스트릭을 갱신합니다.")
    public ApiResponse<StreakResponse> refreshStreak(@RequestParam(defaultValue = "1") Long learnerId) {
        return ApiResponse.ok(learnerStreakService.refreshStreak(learnerId));
    }

    // 누락되었던 API 추가
    @PostMapping("/recovery-plans")
    @Operation(summary = "스트릭 복구 계획 생성", description = "끊긴 스트릭을 복구하기 위한 계획을 제출합니다.")
    public ApiResponse<Object> createRecoveryPlan(
            @RequestParam(defaultValue = "1") Long learnerId,
            @RequestBody String planDetails) {
        return ApiResponse.ok(learnerStreakService.createRecoveryPlan(learnerId, planDetails));
    }
}