package com.devpath.api.admin.dto.governance;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Schema(description = "시스템 정책 수정 요청")
public class SystemPolicyUpdateRequest {

  @NotNull
  @Min(0)
  @Max(100)
  @Schema(description = "플랫폼 수수료율", example = "20")
  private Integer platformFeeRate;

  @NotNull
  @Min(0)
  @Max(30)
  @Schema(description = "환불 정책 일수", example = "7")
  private Integer refundPolicyDays;

  @NotNull
  @Min(0)
  @Schema(description = "최대 강의 가격", example = "300000")
  private Long maxCoursePrice;
}
