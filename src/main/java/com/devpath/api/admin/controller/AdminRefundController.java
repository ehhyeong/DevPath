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
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "관리자 - 환불", description = "관리자 환불 관리 API")
@RestController
@RequestMapping("/api/admin/refunds")
@RequiredArgsConstructor
public class AdminRefundController {

  private final AdminRefundService adminRefundService;

  // 승인 시에는 최신 PENDING settlement 금액을 먼저 차감한 뒤 상태를 승인으로 바꾼다.
  @Operation(summary = "환불 승인")
  @PostMapping("/{refundId}/approve")
  public ApiResponse<Void> approveRefund(
      @PathVariable Long refundId,
      @RequestBody @Valid RefundProcessRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    adminRefundService.approveRefund(refundId, userId, request);
    return ApiResponse.success("환불이 승인되었습니다.", null);
  }

  // 반려는 상태와 심사 이력만 남기고 정산 금액은 건드리지 않는다.
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
