package com.devpath.domain.workspace.repository;

import com.devpath.domain.workspace.entity.WorkspaceFile;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WorkspaceFileRepository extends JpaRepository<WorkspaceFile, Long> {

  Optional<WorkspaceFile> findByIdAndIsDeletedFalse(Long id);

  Optional<WorkspaceFile> findByIdAndWorkspaceIdAndIsDeletedFalse(Long id, Long workspaceId);

  List<WorkspaceFile> findAllByWorkspaceIdAndIsDeletedFalseOrderByCreatedAtDesc(Long workspaceId);

  List<WorkspaceFile> findAllByWorkspaceIdAndParentIdIsNullAndIsDeletedFalseOrderByCreatedAtDesc(
      Long workspaceId);

  List<WorkspaceFile> findAllByWorkspaceIdAndParentIdAndIsDeletedFalseOrderByCreatedAtDesc(
      Long workspaceId, Long parentId);

  List<WorkspaceFile> findAllByParentIdAndIsDeletedFalse(Long parentId);
}
