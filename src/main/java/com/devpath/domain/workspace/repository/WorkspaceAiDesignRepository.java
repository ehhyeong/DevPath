package com.devpath.domain.workspace.repository;

import com.devpath.domain.workspace.entity.WorkspaceAiDesign;
import jakarta.persistence.LockModeType;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

public interface WorkspaceAiDesignRepository extends JpaRepository<WorkspaceAiDesign, Long> {
  Optional<WorkspaceAiDesign> findByWorkspaceId(Long workspaceId);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select d from WorkspaceAiDesign d where d.workspaceId = :workspaceId")
  Optional<WorkspaceAiDesign> findForUpdateByWorkspaceId(Long workspaceId);

  List<WorkspaceAiDesign> findAllByWorkspaceIdIn(Collection<Long> workspaceIds);

  Optional<WorkspaceAiDesign> findByJobId(UUID jobId);
}
