package com.devpath.domain.workspace.repository;

import com.devpath.domain.workspace.entity.WorkspaceInterviewPractice;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WorkspaceInterviewPracticeRepository
    extends JpaRepository<WorkspaceInterviewPractice, Long> {
  Optional<WorkspaceInterviewPractice> findByWorkspaceIdAndUserId(Long workspaceId, Long userId);

  List<WorkspaceInterviewPractice> findAllByWorkspaceId(Long workspaceId);
}
