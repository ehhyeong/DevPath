package com.devpath.domain.operation.integration;

import com.devpath.api.workspace.integration.GithubPullRequestSyncService;
import com.devpath.api.workspace.integration.GithubRepositoryReference;
import com.devpath.api.workspace.integration.dto.IntegrationResponse;
import com.devpath.api.workspace.integration.dto.IntegrationStatusUpdateRequest;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.workspace.entity.Workspace;
import com.devpath.domain.workspace.repository.WorkspaceMemberRepository;
import com.devpath.domain.workspace.repository.WorkspaceRepository;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ExternalIntegrationService {

  private final ExternalIntegrationRepository integrationRepository;
  private final WorkspaceRepository workspaceRepository;
  private final WorkspaceMemberRepository workspaceMemberRepository;
  private final GithubPullRequestSyncService githubPullRequestSyncService;

  @Transactional
  public List<IntegrationResponse> getIntegrationsByWorkspace(Long workspaceId, Long userId) {
    getWorkspaceAndValidateMember(workspaceId, userId);
    ensureDefaultIntegrations(workspaceId);

    return integrationRepository.findByWorkspaceId(workspaceId).stream()
        .map(IntegrationResponse::from)
        .collect(Collectors.toList());
  }

  @Transactional
  public IntegrationResponse updateIntegrationStatus(
      Long workspaceId,
      Long userId,
      IntegrationProvider provider,
      IntegrationStatusUpdateRequest request) {
    Workspace workspace = getWorkspaceAndValidateMember(workspaceId, userId);
    validateOwner(workspace, userId);

    ExternalIntegration integration =
        integrationRepository
            .findByWorkspaceIdAndProvider(workspaceId, provider)
            .orElseGet(
                () ->
                    integrationRepository.save(
                        ExternalIntegration.builder()
                            .workspaceId(workspaceId)
                            .provider(provider)
                            .build()));

    if (request.getIsActive()) {
      if (provider == IntegrationProvider.GITHUB) {
        configureGithubRepository(integration, request);
      }
      integration.activate();
      if (provider == IntegrationProvider.GITHUB) {
        githubPullRequestSyncService.syncWorkspacePullRequests(workspaceId, userId, integration);
      }
    } else {
      integration.deactivate();
    }

    return IntegrationResponse.from(integration);
  }

  @Transactional
  public IntegrationResponse syncGithubPullRequests(Long workspaceId, Long userId) {
    Workspace workspace = getWorkspaceAndValidateMember(workspaceId, userId);
    validateOwner(workspace, userId);

    ExternalIntegration integration =
        integrationRepository
            .findByWorkspaceIdAndProvider(workspaceId, IntegrationProvider.GITHUB)
            .orElseThrow(() -> new CustomException(ErrorCode.INTEGRATION_NOT_FOUND));

    if (!integration.isActive()) {
      throw new CustomException(ErrorCode.INVALID_INPUT, "GitHub 연동을 먼저 켜주세요.");
    }

    githubPullRequestSyncService.syncWorkspacePullRequests(workspaceId, userId, integration);
    return IntegrationResponse.from(integration);
  }

  private void configureGithubRepository(
      ExternalIntegration integration, IntegrationStatusUpdateRequest request) {
    String repositoryUrl = request.getRepositoryUrl();
    if (!StringUtils.hasText(repositoryUrl)) {
      repositoryUrl = integration.getRepositoryUrl();
    }

    if (!StringUtils.hasText(repositoryUrl)) {
      throw new CustomException(ErrorCode.INVALID_INPUT, "GitHub 저장소 URL을 입력해 주세요.");
    }

    GithubRepositoryReference repository =
        githubPullRequestSyncService.parseRepositoryUrl(repositoryUrl);
    integration.configureRepository(
        repository.normalizedUrl(), repository.owner(), repository.name());

    if (StringUtils.hasText(request.getGithubToken())) {
      integration.configureRepositoryAccessToken(request.getGithubToken().trim());
    }
  }

  private void ensureDefaultIntegrations(Long workspaceId) {
    Arrays.stream(IntegrationProvider.values())
        .filter(
            provider ->
                integrationRepository.findByWorkspaceIdAndProvider(workspaceId, provider).isEmpty())
        .map(
            provider ->
                ExternalIntegration.builder().workspaceId(workspaceId).provider(provider).build())
        .forEach(integrationRepository::save);
  }

  private Workspace getWorkspaceAndValidateMember(Long workspaceId, Long userId) {
    Workspace workspace =
        workspaceRepository
            .findByIdAndIsDeletedFalse(workspaceId)
            .orElseThrow(() -> new CustomException(ErrorCode.WORKSPACE_NOT_FOUND));

    boolean isMember = workspaceMemberRepository.existsByWorkspaceIdAndLearnerId(workspaceId, userId);
    boolean isOwner = workspace.getOwnerId().equals(userId);
    if (!isMember && !isOwner) {
      throw new CustomException(ErrorCode.WORKSPACE_FORBIDDEN);
    }

    return workspace;
  }

  private void validateOwner(Workspace workspace, Long userId) {
    if (!workspace.getOwnerId().equals(userId)) {
      throw new CustomException(ErrorCode.WORKSPACE_FORBIDDEN);
    }
  }
}
