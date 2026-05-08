package com.devpath.api.instructor.dto.marketing;

import com.devpath.api.instructor.entity.PromotionStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Schema(description = "프로모션 상태 변경 요청")
public class PromotionStatusUpdateRequest {

  @NotNull
  @Schema(
      description = "프로모션 상태",
      example = "ACTIVE",
      allowableValues = {"ACTIVE", "INACTIVE"})
  private PromotionStatus status;
}
