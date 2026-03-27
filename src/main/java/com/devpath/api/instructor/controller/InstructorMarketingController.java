package com.devpath.api.instructor.controller;

import com.devpath.api.instructor.dto.marketing.ConversionResponse;
import com.devpath.api.instructor.dto.marketing.CouponCreateRequest;
import com.devpath.api.instructor.dto.marketing.CouponResponse;
import com.devpath.api.instructor.dto.marketing.PromotionCreateRequest;
import com.devpath.api.instructor.dto.marketing.PromotionStatusUpdateRequest;
import com.devpath.api.instructor.service.InstructorMarketingService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Instructor - Marketing", description = "강사 마케팅 도구 API")
@RestController
@RequestMapping("/api/instructor/marketing")
@RequiredArgsConstructor
public class InstructorMarketingController {

    private final InstructorMarketingService instructorMarketingService;

    @Operation(summary = "할인 쿠폰 발행")
    @PostMapping("/coupons")
    public ApiResponse<CouponResponse> createCoupon(
            @RequestBody @Valid CouponCreateRequest request,
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
        return ApiResponse.success("쿠폰이 발행되었습니다.", instructorMarketingService.createCoupon(userId, request));
    }

    @Operation(summary = "타임세일/프로모션 등록")
    @PostMapping("/promotions")
    public ApiResponse<Void> createPromotion(
            @RequestBody @Valid PromotionCreateRequest request,
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
        instructorMarketingService.createPromotion(userId, request);
        return ApiResponse.success("프로모션이 등록되었습니다.", null);
    }

    @Operation(summary = "강의 홍보 상태 변경")
    @PatchMapping("/courses/{courseId}/promotion-status")
    public ApiResponse<Void> updatePromotionStatus(
            @PathVariable Long courseId,
            @RequestBody @Valid PromotionStatusUpdateRequest request,
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
        instructorMarketingService.updatePromotionStatus(courseId, userId, request);
        return ApiResponse.success("홍보 상태가 변경되었습니다.", null);
    }

    @Operation(summary = "유입/전환 통계 조회")
    @GetMapping("/conversions")
    public ApiResponse<ConversionResponse> getConversions(
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
        return ApiResponse.success("전환 통계를 조회했습니다.", instructorMarketingService.getConversions(userId));
    }
}