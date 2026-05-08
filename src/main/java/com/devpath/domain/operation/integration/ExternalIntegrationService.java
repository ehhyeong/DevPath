package com.devpath.domain.operation.integration;

import com.devpath.api.workspace.integration.dto.IntegrationResponse;
import com.devpath.api.workspace.integration.dto.IntegrationStatusUpdateRequest;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
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

  public List<IntegrationResponse> getIntegrationsByWorkspace(Long workspaceId) {
    return integrationRepository.findByWorkspaceId(workspaceId).stream()
        .map(IntegrationResponse::from)
        .collect(Collectors.toList());
  }

  @Transactional
  public IntegrationResponse updateIntegrationStatus(
      Long workspaceId, IntegrationProvider provider, IntegrationStatusUpdateRequest request) {
    ExternalIntegration integration =
        integrationRepository
            .findByWorkspaceIdAndProvider(workspaceId, provider)
            .orElseThrow(() -> new CustomException(ErrorCode.INTEGRATION_NOT_FOUND));

    if (request.getIsActive()) {
      integration.activate();
    } else {
      integration.deactivate();
    }

    return IntegrationResponse.from(integration);
  }
}
