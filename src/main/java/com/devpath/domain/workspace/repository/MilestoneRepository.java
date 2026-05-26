package com.devpath.domain.workspace.repository;

import com.devpath.domain.workspace.entity.Milestone;
import com.devpath.domain.workspace.entity.MilestoneStatus;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MilestoneRepository extends JpaRepository<Milestone, Long> {

  Optional<Milestone> findByIdAndIsDeletedFalse(Long id);

  List<Milestone> findAllByWorkspaceIdAndIsDeletedFalseOrderByDueDateAsc(Long workspaceId);

  List<Milestone> findAllByWorkspaceIdInAndIsDeletedFalseOrderByDueDateAsc(
      Collection<Long> workspaceIds);

  long countByWorkspaceIdAndStatusInAndIsDeletedFalse(
      Long workspaceId, Collection<MilestoneStatus> statuses);

  long countByWorkspaceIdInAndStatusInAndIsDeletedFalse(
      Collection<Long> workspaceIds, Collection<MilestoneStatus> statuses);
}
