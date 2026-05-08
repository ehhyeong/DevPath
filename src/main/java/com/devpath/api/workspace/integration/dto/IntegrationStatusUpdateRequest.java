package com.devpath.api.workspace.integration.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Schema(description = "외부 서비스 연동 상태 변경 요청 DTO")
public class IntegrationStatusUpdateRequest {

  @NotNull(message = "활성화 상태값은 필수입니다.")
  @Schema(description = "변경할 활성화 상태 (true: 연동, false: 해제)", example = "true")
  private Boolean isActive;

  public IntegrationStatusUpdateRequest(Boolean isActive) {
    this.isActive = isActive;
  }
}
