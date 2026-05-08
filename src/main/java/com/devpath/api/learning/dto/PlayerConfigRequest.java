package com.devpath.api.learning.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

public class PlayerConfigRequest {

  @Getter
  @NoArgsConstructor
  @Schema(description = "재생 속도 저장 요청 DTO")
  public static class UpdatePlaybackRate {

    @NotNull(message = "기본 재생 속도는 필수입니다.")
    @DecimalMin(value = "0.5", message = "재생 속도는 0.5 이상이어야 합니다.")
    @DecimalMax(value = "2.0", message = "재생 속도는 2.0 이하여야 합니다.")
    @Schema(description = "기본 재생 속도", example = "1.25")
    private Double defaultPlaybackRate;
  }

  @Getter
  @NoArgsConstructor
  @Schema(description = "PIP 모드 설정 요청 DTO")
  public static class UpdatePipMode {

    @NotNull(message = "PIP 모드 여부는 필수입니다.")
    @Schema(description = "PIP 모드 활성화 여부", example = "true")
    private Boolean pipEnabled;
  }
}
