package com.devpath.domain.project.repository;

import com.devpath.domain.project.entity.ProjectInvitation;
import com.devpath.domain.project.entity.ProjectInvitationStatus;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProjectInvitationRepository extends JpaRepository<ProjectInvitation, Long> {

  boolean existsByProjectIdAndInviteeIdAndStatus(
      Long projectId, Long inviteeId, ProjectInvitationStatus status);
}
