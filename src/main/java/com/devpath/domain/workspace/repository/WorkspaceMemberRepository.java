package com.devpath.domain.workspace.repository;

import com.devpath.domain.workspace.entity.WorkspaceMember;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WorkspaceMemberRepository extends JpaRepository<WorkspaceMember, Long> {

  List<WorkspaceMember> findAllByLearnerId(Long learnerId);

  List<WorkspaceMember> findAllByWorkspaceId(Long workspaceId);

  List<WorkspaceMember> findAllByWorkspaceIdIn(Collection<Long> workspaceIds);

  boolean existsByWorkspaceIdAndLearnerId(Long workspaceId, Long learnerId);
}
