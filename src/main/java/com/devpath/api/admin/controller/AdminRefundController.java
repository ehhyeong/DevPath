package com.devpath.api.admin.controller;

import com.devpath.api.admin.dto.refund.RefundProcessRequest;
import com.devpath.api.admin.service.AdminRefundService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Admin - Refund", description = "관리자 환불 관리 API")
@RestController
@RequestMapping("/api/admin/refunds")
@RequiredArgsConstructor
public class AdminRefundController {

    private final AdminRefundService adminRefundService;

    @Operation(summary = "환불 승인")
    @PostMapping("/{refundId}/approve")
    public ApiResponse<Void> approveRefund(
            @PathVariable Long refundId,
            @RequestBody @Valid RefundProcessRequest request,
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
        adminRefundService.approveRefund(refundId, userId, request);
        return ApiResponse.success("환불이 승인되었습니다.", null);
    }

    @Operation(summary = "환불 반려")
    @PostMapping("/{refundId}/reject")
    public ApiResponse<Void> rejectRefund(
            @PathVariable Long refundId,
            @RequestBody @Valid RefundProcessRequest request,
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
        adminRefundService.rejectRefund(refundId, userId, request);
        return ApiResponse.success("환불이 반려되었습니다.", null);
    }
}