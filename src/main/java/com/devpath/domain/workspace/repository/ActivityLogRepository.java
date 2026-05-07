package com.devpath.domain.workspace.repository;

import com.devpath.domain.workspace.entity.ActivityLog;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ActivityLogRepository extends JpaRepository<ActivityLog, Long> {

    List<ActivityLog> findAllByWorkspaceIdOrderByCreatedAtDesc(Long workspaceId);

    List<ActivityLog> findTop10ByWorkspaceIdOrderByCreatedAtDesc(Long workspaceId);
}