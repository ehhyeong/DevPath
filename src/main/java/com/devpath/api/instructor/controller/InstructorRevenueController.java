package com.devpath.api.instructor.controller;

import com.devpath.api.instructor.dto.revenue.RevenueResponse;
import com.devpath.api.instructor.dto.revenue.SettlementResponse;
import com.devpath.api.instructor.service.InstructorRevenueService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "Instructor - Revenue & Settlement", description = "강사 수익/정산 API")
@RestController
@RequestMapping("/api/instructor/revenues")
@RequiredArgsConstructor
public class InstructorRevenueController {

    private final InstructorRevenueService instructorRevenueService;

    @Operation(summary = "수익 현황 조회")
    @GetMapping
    public ApiResponse<RevenueResponse> getRevenue(
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
        return ApiResponse.success("수익 현황을 조회했습니다.", instructorRevenueService.getRevenue(userId));
    }

    @Operation(summary = "정산 현황 조회")
    @GetMapping("/settlements")
    public ApiResponse<List<SettlementResponse>> getSettlements(
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
        return ApiResponse.success("정산 현황을 조회했습니다.", instructorRevenueService.getSettlements(userId));
    }
}