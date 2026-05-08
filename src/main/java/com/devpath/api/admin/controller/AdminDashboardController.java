package com.devpath.api.admin.controller;

import com.devpath.api.admin.dto.dashboard.AdminDashboardOverviewResponse;
import com.devpath.api.admin.service.AdminDashboardService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "관리자 - 대시보드", description = "관리자 대시보드 조회 API")
@RestController
@RequestMapping("/api/admin/dashboard")
@RequiredArgsConstructor
// 관리자 대시보드 개요 API를 제공한다.
public class AdminDashboardController {

  private final AdminDashboardService adminDashboardService;

  @Operation(summary = "관리자 대시보드 개요 조회")
  @GetMapping("/overview")
  // 상단 카드와 차트가 필요한 요약 데이터를 한 번에 내려준다.
  public ApiResponse<AdminDashboardOverviewResponse> getOverview() {
    return ApiResponse.success("관리자 대시보드 개요를 조회했습니다.", adminDashboardService.getOverview());
  }
}
