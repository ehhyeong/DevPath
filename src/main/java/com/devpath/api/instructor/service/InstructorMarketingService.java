package com.devpath.api.instructor.service;

import com.devpath.api.instructor.dto.marketing.ConversionResponse;
import com.devpath.api.instructor.dto.marketing.CouponCreateRequest;
import com.devpath.api.instructor.dto.marketing.CouponResponse;
import com.devpath.api.instructor.dto.marketing.PromotionCreateRequest;
import com.devpath.api.instructor.dto.marketing.PromotionStatusUpdateRequest;
import com.devpath.api.instructor.entity.ConversionStat;
import com.devpath.api.instructor.entity.Coupon;
import com.devpath.api.instructor.entity.Promotion;
import com.devpath.api.instructor.repository.ConversionStatRepository;
import com.devpath.api.instructor.repository.CouponRepository;
import com.devpath.api.instructor.repository.PromotionRepository;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class InstructorMarketingService {

    private final CouponRepository couponRepository;
    private final PromotionRepository promotionRepository;
    private final ConversionStatRepository conversionStatRepository;

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

        promotion.updateStatus(request.getStatus());
    }

    @Transactional(readOnly = true)
    public ConversionResponse getConversions(Long instructorId) {
        return conversionStatRepository.findTopByInstructorIdOrderByCalculatedAtDesc(instructorId)
                .map(this::toConversionResponse)
                .orElseGet(() -> ConversionResponse.builder()
                        .totalVisitors(0L)
                        .totalSignups(0L)
                        .totalPurchases(0L)
                        .signupRate(0.0)
                        .purchaseRate(0.0)
                        .build());
    }

    // 저장된 통계를 응답 DTO로 변환하면서 비율을 계산한다.
    private ConversionResponse toConversionResponse(ConversionStat stat) {
        long totalVisitors = stat.getTotalVisitors();
        long totalSignups = stat.getTotalSignups();
        long totalPurchases = stat.getTotalPurchases();

        double signupRate = totalVisitors == 0
                ? 0.0
                : Math.round((totalSignups * 100.0 / totalVisitors) * 100.0) / 100.0;

        double purchaseRate = totalVisitors == 0
                ? 0.0
                : Math.round((totalPurchases * 100.0 / totalVisitors) * 100.0) / 100.0;

        return ConversionResponse.builder()
                .totalVisitors(totalVisitors)
                .totalSignups(totalSignups)
                .totalPurchases(totalPurchases)
                .signupRate(signupRate)
                .purchaseRate(purchaseRate)
                .build();
    }
}
