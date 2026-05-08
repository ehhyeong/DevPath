package com.devpath.api.instructor.dto.marketing;

import java.time.LocalDateTime;

public record CouponListResponse(
    Long id,
    String couponTitle,
    Long targetCourseId,
    String targetCourseTitle,
    String couponCode,
    String discountType,
    Long discountValue,
    Integer usageCount,
    Integer maxUsageCount,
    LocalDateTime expiresAt,
    Boolean active) {}
