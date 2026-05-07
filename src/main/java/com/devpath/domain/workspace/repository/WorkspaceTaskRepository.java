package com.devpath.domain.workspace.repository;

import com.devpath.domain.workspace.entity.WorkspaceTask;
import com.devpath.domain.workspace.entity.WorkspaceTaskStatus;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WorkspaceTaskRepository extends JpaRepository<WorkspaceTask, Long> {

    Optional<WorkspaceTask> findByIdAndIsDeletedFalse(Long id);

    List<WorkspaceTask> findAllByWorkspaceIdAndIsDeletedFalseOrderByCreatedAtDesc(Long workspaceId);

    List<WorkspaceTask> findAllByWorkspaceIdAndStatusAndIsDeletedFalseOrderByCreatedAtDesc(
            Long workspaceId, WorkspaceTaskStatus status);

    long countByWorkspaceIdAndStatusNotAndIsDeletedFalse(Long workspaceId, WorkspaceTaskStatus status);

    long countByWorkspaceIdInAndStatusNotAndIsDeletedFalse(
            Collection<Long> workspaceIds, WorkspaceTaskStatus status);
}