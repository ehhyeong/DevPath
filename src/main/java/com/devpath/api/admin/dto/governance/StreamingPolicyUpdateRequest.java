package com.devpath.api.admin.dto.governance;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Schema(description = "스트리밍 정책 수정 요청")
public class StreamingPolicyUpdateRequest {

  @NotNull
  @Schema(description = "HLS 활성화 여부", example = "true")
  private Boolean hlsEnabled;

  @NotNull
  @Pattern(regexp = "^(480p|720p|1080p|1440p|2160p)$")
  @Schema(description = "최대 해상도", example = "1080p")
  private String maxResolution;

  @NotNull
  @Schema(description = "워터마크 활성화 여부", example = "true")
  private Boolean watermarkEnabled;
}
