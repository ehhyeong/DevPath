package com.devpath.api.instructor.dto.marketing;

import com.devpath.api.instructor.entity.Coupon;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class CouponResponse {

    private Long id;
    private Long instructorId;
    private String couponCode;
    private String discountType;
    private Long discountValue;
    private Long targetCourseId;
    private Integer maxUsageCount;
    private LocalDateTime expiresAt;

    public static CouponResponse from(Coupon coupon) {
        return CouponResponse.builder()
                .id(coupon.getId())
                .instructorId(coupon.getInstructorId())
                .couponCode(coupon.getCouponCode())
                .discountType(coupon.getDiscountType())
                .discountValue(coupon.getDiscountValue())
                .targetCourseId(coupon.getTargetCourseId())
                .maxUsageCount(coupon.getMaxUsageCount())
                .expiresAt(coupon.getExpiresAt())
                .build();
    }
}