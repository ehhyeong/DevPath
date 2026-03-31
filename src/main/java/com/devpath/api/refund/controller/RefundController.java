package com.devpath.api.refund.controller;

import com.devpath.api.refund.dto.RefundRequestDto;
import com.devpath.api.refund.dto.RefundResponse;
import com.devpath.api.refund.service.RefundService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Learner - Refund", description = "학습자 환불 API")
@RestController
@RequestMapping("/api/refunds")
@RequiredArgsConstructor
public class RefundController {

    private final RefundService refundService;

    // 환불 요청은 서비스에서 기간/진도율/중복 요청 규칙을 모두 검증한다.
    @Operation(summary = "환불 요청", description = "학습자가 강의 환불을 요청합니다.")
    @PostMapping
    public ApiResponse<RefundResponse> requestRefund(
            @Valid @RequestBody RefundRequestDto request,
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId
    ) {
        return ApiResponse.success("환불 요청이 완료되었습니다.", refundService.requestRefund(request, userId));
    }

    // 마이페이지에서는 본인 환불 요청 목록을 최신순으로 조회한다.
    @Operation(summary = "내 환불 내역 조회", description = "학습자 본인의 환불 요청 목록을 조회합니다.")
    @GetMapping("/me")
    public ApiResponse<List<RefundResponse>> getMyRefunds(
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId
    ) {
        return ApiResponse.success("환불 내역 조회 성공", refundService.getMyRefunds(userId));
    }
}
