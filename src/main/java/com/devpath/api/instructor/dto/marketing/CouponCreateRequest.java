package com.devpath.api.instructor.dto.marketing;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CouponCreateRequest {

  @NotBlank private String couponTitle;

  private Long targetCourseId;

  @NotBlank private String discountType;

  @NotNull private Long discountValue;

  private Integer maxUsageCount;

  private LocalDateTime expiresAt;
}
