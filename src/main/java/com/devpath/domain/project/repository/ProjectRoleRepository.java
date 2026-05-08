package com.devpath.domain.project.repository;

import com.devpath.domain.project.entity.ProjectRole;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProjectRoleRepository extends JpaRepository<ProjectRole, Long> {

  Optional<ProjectRole> findByIdAndProjectId(Long roleId, Long projectId);
}
