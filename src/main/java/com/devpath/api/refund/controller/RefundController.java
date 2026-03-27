package com.devpath.api.refund.controller;

import com.devpath.api.refund.dto.RefundRequestDto;
import com.devpath.api.refund.dto.RefundResponse;
import com.devpath.api.refund.service.RefundService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Learner - Refund", description = "학습자 환불 API")
@RestController
@RequestMapping("/api/refunds")
@RequiredArgsConstructor
public class RefundController {

    private final RefundService refundService;

    @Operation(summary = "환불 요청", description = "학습자가 강의 환불을 요청합니다.")
    @PostMapping
    public ApiResponse<RefundResponse> requestRefund(
            @RequestBody @Valid RefundRequestDto request,
            @AuthenticationPrincipal Long userId) {
        return ApiResponse.success("환불 요청이 완료되었습니다.", refundService.requestRefund(request, userId));
    }

    @Operation(summary = "내 환불 내역 조회", description = "학습자 본인의 환불 요청 목록을 조회합니다.")
    @GetMapping("/me")
    public ApiResponse<List<RefundResponse>> getMyRefunds(
            @AuthenticationPrincipal Long userId) {
        return ApiResponse.success("환불 내역 조회 성공", refundService.getMyRefunds(userId));
    }
}