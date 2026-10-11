package com.devpath.domain.workspace.repository;

import com.devpath.domain.workspace.entity.WorkspaceMember;
import jakarta.persistence.LockModeType;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

public interface WorkspaceMemberRepository extends JpaRepository<WorkspaceMember, Long> {

  List<WorkspaceMember> findAllByLearnerId(Long learnerId);

  List<WorkspaceMember> findAllByWorkspaceId(Long workspaceId);

  List<WorkspaceMember> findAllByWorkspaceIdIn(Collection<Long> workspaceIds);

  Optional<WorkspaceMember> findByWorkspaceIdAndLearnerId(Long workspaceId, Long learnerId);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query(
      "select m from WorkspaceMember m where m.workspaceId = :workspaceId and m.learnerId = :learnerId")
  Optional<WorkspaceMember> findForUpdateByWorkspaceIdAndLearnerId(
      Long workspaceId, Long learnerId);

  boolean existsByWorkspaceIdAndLearnerId(Long workspaceId, Long learnerId);
}
