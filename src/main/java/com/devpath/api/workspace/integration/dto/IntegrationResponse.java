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

  @Schema(description = "GitHub 저장소 URL", example = "https://github.com/devpath/app")
  private String repositoryUrl;

  @Schema(description = "GitHub 저장소 소유자", example = "devpath")
  private String repositoryOwner;

  @Schema(description = "GitHub 저장소 이름", example = "app")
  private String repositoryName;

  @Schema(description = "마지막 GitHub PR 동기화 일시")
  private LocalDateTime lastSyncedAt;

  @Schema(description = "마지막 GitHub PR 동기화 메시지")
  private String lastSyncMessage;

  @Schema(description = "GitHub API 호출용 서버 저장 토큰 설정 여부", example = "true")
  private boolean githubTokenConfigured;

  public static IntegrationResponse from(ExternalIntegration integration) {
    return IntegrationResponse.builder()
        .id(integration.getId())
        .workspaceId(integration.getWorkspaceId())
        .provider(integration.getProvider())
        .isActive(integration.isActive())
        .connectedAt(integration.getConnectedAt())
        .repositoryUrl(integration.getRepositoryUrl())
        .repositoryOwner(integration.getRepositoryOwner())
        .repositoryName(integration.getRepositoryName())
        .lastSyncedAt(integration.getLastSyncedAt())
        .lastSyncMessage(integration.getLastSyncMessage())
        .githubTokenConfigured(
            org.springframework.util.StringUtils.hasText(integration.getRepositoryAccessToken()))
        .build();
  }
}
