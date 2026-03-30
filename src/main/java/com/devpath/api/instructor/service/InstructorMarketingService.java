package com.devpath.api.instructor.service;

import com.devpath.api.instructor.dto.marketing.ConversionResponse;
import com.devpath.api.instructor.dto.marketing.CouponCreateRequest;
import com.devpath.api.instructor.dto.marketing.CouponResponse;
import com.devpath.api.instructor.dto.marketing.PromotionCreateRequest;
import com.devpath.api.instructor.dto.marketing.PromotionStatusUpdateRequest;
import com.devpath.api.instructor.entity.Coupon;
import com.devpath.api.instructor.entity.Promotion;
import com.devpath.api.instructor.repository.CouponRepository;
import com.devpath.api.instructor.repository.PromotionRepository;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class InstructorMarketingService {

    private final CouponRepository couponRepository;
    private final PromotionRepository promotionRepository;

    public CouponResponse createCoupon(Long instructorId, CouponCreateRequest request) {
        String couponCode = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        Coupon coupon = Coupon.builder()
                .instructorId(instructorId)
                .couponCode(couponCode)
                .discountType(request.getDiscountType())
                .discountValue(request.getDiscountValue())
                .targetCourseId(request.getTargetCourseId())
                .maxUsageCount(request.getMaxUsageCount())
                .expiresAt(request.getExpiresAt())
                .build();
        return CouponResponse.from(couponRepository.save(coupon));
    }

    public void createPromotion(Long instructorId, PromotionCreateRequest request) {
        if (request.getEndAt() != null && request.getStartAt() != null
                && !request.getEndAt().isAfter(request.getStartAt())) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
        Promotion promotion = Promotion.builder()
                .instructorId(instructorId)
                .courseId(request.getCourseId())
                .promotionType(request.getPromotionType())
                .discountRate(request.getDiscountRate())
                .startAt(request.getStartAt())
                .endAt(request.getEndAt())
                .build();
        promotionRepository.save(promotion);
    }

    public void updatePromotionStatus(Long courseId, Long instructorId, PromotionStatusUpdateRequest request) {
        Promotion promotion = promotionRepository.findByIdAndIsDeletedFalse(courseId)
                .orElseThrow(() -> new CustomException(ErrorCode.PROMOTION_NOT_FOUND));
        promotion.updateStatus(request.getIsActive());
    }

    @Transactional(readOnly = true)
    public ConversionResponse getConversions(Long instructorId) {
        // TODO: 실제 집계 연동 예정 (GPT 연동)
        return ConversionResponse.builder()
                .totalVisitors(1200L)
                .totalSignups(340L)
                .totalPurchases(87L)
                .signupRate(28.3)
                .purchaseRate(7.25)
                .build();
    }
}