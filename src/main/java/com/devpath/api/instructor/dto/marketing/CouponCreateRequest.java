package com.devpath.api.instructor.dto.marketing;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CouponCreateRequest {

    private Long targetCourseId;

    @NotBlank
    private String discountType;

    @NotNull
    private Long discountValue;

    private Integer maxUsageCount;

    private LocalDateTime expiresAt;
}