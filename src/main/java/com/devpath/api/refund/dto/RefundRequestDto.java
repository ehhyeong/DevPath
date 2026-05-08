package com.devpath.api.refund.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Schema(description = "학습자 환불 요청")
public class RefundRequestDto {

  @NotNull(message = "강의 ID는 필수입니다.")
  @Schema(description = "환불 요청 대상 강의 ID", example = "101")
  private Long courseId;

  @NotBlank(message = "환불 사유는 필수입니다.")
  @Schema(description = "환불 사유", example = "강의 내용이 기대와 달라 수강을 지속하기 어렵습니다.")
  private String reason;
}
