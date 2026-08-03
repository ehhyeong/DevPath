package com.devpath.api.workspace.integration.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
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

  @Size(max = 1000, message = "저장소 URL은 1000자 이하여야 합니다.")
  @Schema(description = "GitHub 저장소 URL", example = "https://github.com/devpath/app")
  private String repositoryUrl;

  @Size(max = 2000, message = "GitHub 토큰은 2000자 이하여야 합니다.")
  @Schema(description = "GitHub API 호출용 서버 저장 토큰", example = "github_pat_...")
  private String githubToken;

  public IntegrationStatusUpdateRequest(Boolean isActive) {
    this.isActive = isActive;
  }

  public IntegrationStatusUpdateRequest(Boolean isActive, String repositoryUrl) {
    this.isActive = isActive;
    this.repositoryUrl = repositoryUrl;
  }

  public IntegrationStatusUpdateRequest(
      Boolean isActive, String repositoryUrl, String githubToken) {
    this.isActive = isActive;
    this.repositoryUrl = repositoryUrl;
    this.githubToken = githubToken;
  }
}
