package com.devpath.api.instructor.dto.marketing;

import java.time.LocalDateTime;

public record PromotionListResponse(
    Long id,
    Long courseId,
    String courseTitle,
    String promotionType,
    Integer discountRate,
    Boolean active,
    LocalDateTime startAt,
    LocalDateTime endAt) {}
