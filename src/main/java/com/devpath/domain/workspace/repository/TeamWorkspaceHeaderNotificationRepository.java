package com.devpath.domain.workspace.repository;

import com.devpath.domain.workspace.entity.TeamWorkspaceHeaderNotification;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TeamWorkspaceHeaderNotificationRepository
    extends JpaRepository<TeamWorkspaceHeaderNotification, Long> {

  List<TeamWorkspaceHeaderNotification>
      findByWorkspaceIdAndPageKeyAndIsDeletedFalseOrderByDisplayOrderAscCreatedAtDesc(
          Long workspaceId, String pageKey);

  List<TeamWorkspaceHeaderNotification> findByWorkspaceIdAndPageKeyAndIsDeletedFalse(
      Long workspaceId, String pageKey);
}
