package com.devpath.api.workspace.integration.dto;

import com.devpath.domain.operation.integration.ExternalIntegration;
import com.devpath.domain.operation.integration.IntegrationProvider;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@Schema(description = "외부 서비스 연동 상태 응답 DTO")
public class IntegrationResponse {

  @Schema(description = "연동 설정 ID", example = "1")
  private Long id;

  @Schema(description = "워크스페이스 ID", example = "1")
  private Long workspaceId;

  @Schema(description = "외부 서비스 제공자", example = "GITHUB")
  private IntegrationProvider provider;

  @Schema(description = "연동 활성화 여부", example = "true")
  private boolean isActive;

  @Schema(description = "연동된 일시 (활성화 시점)")
  private LocalDateTime connectedAt;

  public static IntegrationResponse from(ExternalIntegration integration) {
    return IntegrationResponse.builder()
        .id(integration.getId())
        .workspaceId(integration.getWorkspaceId())
        .provider(integration.getProvider())
        .isActive(integration.isActive())
        .connectedAt(integration.getConnectedAt())
        .build();
  }
}
