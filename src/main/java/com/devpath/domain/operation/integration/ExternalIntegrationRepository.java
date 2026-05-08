package com.devpath.domain.operation.integration;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ExternalIntegrationRepository extends JpaRepository<ExternalIntegration, Long> {

  List<ExternalIntegration> findByWorkspaceId(Long workspaceId);

  Optional<ExternalIntegration> findByWorkspaceIdAndProvider(
      Long workspaceId, IntegrationProvider provider);
}
