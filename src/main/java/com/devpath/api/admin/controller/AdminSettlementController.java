package com.devpath.api.admin.controller;

import com.devpath.api.admin.dto.settlement.SettlementEligibilityResponse;
import com.devpath.api.admin.dto.settlement.SettlementHoldRequest;
import com.devpath.api.admin.service.AdminSettlementService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Admin - Settlement", description = "관리자 정산 관리 API")
@RestController
@RequestMapping("/api/admin/settlements")
@RequiredArgsConstructor
public class AdminSettlementController {

    private final AdminSettlementService adminSettlementService;

    @Operation(summary = "정산 보류 처리")
    @PostMapping("/{settlementId}/hold")
    public ApiResponse<Void> holdSettlement(
            @PathVariable Long settlementId,
            @RequestBody @Valid SettlementHoldRequest request,
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
        adminSettlementService.holdSettlement(settlementId, userId, request);
        return ApiResponse.success("정산이 보류 처리되었습니다.", null);
    }

    @Operation(summary = "환불 보증기간 기준 정산 가능 여부 계산", description = "환불 요청 ID 기반으로 7일 보증기간 경과 여부 반환")
    @GetMapping("/eligibility")
    public ApiResponse<SettlementEligibilityResponse> checkEligibility(
            @RequestParam Long refundRequestId) {
        return ApiResponse.success("정산 가능 여부를 조회했습니다.", adminSettlementService.checkEligibility(refundRequestId));
    }
}