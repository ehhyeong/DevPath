package com.devpath.api.instructor.controller;

import com.devpath.api.instructor.dto.analytics.InstructorAnalyticsDashboardResponse;
import com.devpath.api.instructor.service.InstructorAnalyticsService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "강사 - 분석", description = "강사 분석 대시보드 API")
@RestController
@RequestMapping("/api/instructor/analytics")
@RequiredArgsConstructor
public class InstructorAnalyticsController {

  private final InstructorAnalyticsService instructorAnalyticsService;

  @Operation(summary = "강사 분석 대시보드 조회")
  @GetMapping("/dashboard")
  public ApiResponse<InstructorAnalyticsDashboardResponse> getDashboard(
      @RequestParam(required = false) Long courseId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.success(
        "Instructor analytics loaded.", instructorAnalyticsService.getDashboard(userId, courseId));
  }
}
