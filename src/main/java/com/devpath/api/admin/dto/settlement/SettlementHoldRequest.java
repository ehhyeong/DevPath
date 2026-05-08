package com.devpath.api.admin.dto.settlement;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Schema(description = "정산 보류 요청")
public class SettlementHoldRequest {

  @NotBlank
  @Schema(description = "보류 사유", example = "환불 분쟁 처리 중")
  private String reason;
}
