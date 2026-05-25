package com.devpath.domain.workspace.repository;

import com.devpath.domain.workspace.entity.TeamWorkspaceHeaderNotification;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TeamWorkspaceHeaderNotificationRepository
    extends JpaRepository<TeamWorkspaceHeaderNotification, Long> {

  List<TeamWorkspaceHeaderNotification>
      findByWorkspaceIdAndPageKeyAndIsDeletedFalseOrderByDisplayOrderAscCreatedAtDesc(
          Long workspaceId, String pageKey);

  List<TeamWorkspaceHeaderNotification>
      findByWorkspaceIdAndPageKeyStartingWithAndIsDeletedFalseOrderByDisplayOrderAscCreatedAtDesc(
          Long workspaceId, String pageKeyPrefix);

  List<TeamWorkspaceHeaderNotification>
      findByWorkspaceIdInAndIsDeletedFalseOrderByCreatedAtDesc(Collection<Long> workspaceIds);

  List<TeamWorkspaceHeaderNotification> findByWorkspaceIdAndPageKeyAndIsDeletedFalse(
      Long workspaceId, String pageKey);
}
