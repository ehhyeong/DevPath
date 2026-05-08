package com.devpath.domain.operation.notice;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface WorkspaceNoticeRepository extends JpaRepository<WorkspaceNotice, Long> {

  List<WorkspaceNotice> findByWorkspaceIdAndIsDeletedFalseOrderByCreatedAtDesc(Long workspaceId);

  Optional<WorkspaceNotice> findByIdAndIsDeletedFalse(Long id);

  long countByWorkspaceIdAndIsDeletedFalse(Long workspaceId);
}
