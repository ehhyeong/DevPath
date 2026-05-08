package com.devpath.domain.workspace.repository;

import com.devpath.domain.workspace.entity.Workspace;
import com.devpath.domain.workspace.entity.WorkspaceType;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WorkspaceRepository extends JpaRepository<Workspace, Long> {

  Optional<Workspace> findByIdAndIsDeletedFalse(Long id);

  List<Workspace> findAllByIdInAndIsDeletedFalseOrderByCreatedAtDesc(Collection<Long> ids);

  List<Workspace> findAllByIdInAndTypeAndIsDeletedFalseOrderByCreatedAtDesc(
      Collection<Long> ids, WorkspaceType type);

  List<Workspace> findAllByIdInAndTypeInAndIsDeletedFalseOrderByCreatedAtDesc(
      Collection<Long> ids, Collection<WorkspaceType> types);

  long countByIdInAndIsDeletedFalse(Collection<Long> ids);
}
