package com.devpath.domain.operation.integration;

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

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ExternalIntegrationService {

  private final ExternalIntegrationRepository integrationRepository;
  private final WorkspaceRepository workspaceRepository;
  private final WorkspaceMemberRepository workspaceMemberRepository;

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
      integration.activate();
    } else {
      integration.deactivate();
    }

    return IntegrationResponse.from(integration);
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

    if (!workspaceMemberRepository.existsByWorkspaceIdAndLearnerId(workspaceId, userId)) {
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
