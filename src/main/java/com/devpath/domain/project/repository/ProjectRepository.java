package com.devpath.domain.project.repository;

import com.devpath.domain.project.entity.Project;
import com.devpath.domain.project.entity.ProjectType;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProjectRepository extends JpaRepository<Project, Long> {

  List<Project> findAllByIsDeletedFalseOrderByCreatedAtDesc();

  long countByIsDeletedFalse();

  List<Project> findTop3ByIsDeletedFalseOrderByCreatedAtDesc();

  List<Project> findAllByIdInAndIsDeletedFalseOrderByCreatedAtDesc(Collection<Long> ids);

  Optional<Project> findByIdAndIsDeletedFalse(Long projectId);

  Optional<Project> findByNameAndOwnerIdAndIsDeletedFalse(String name, Long ownerId);

  List<Project> findAllByNameAndProjectTypeAndIsDeletedFalse(String name, ProjectType projectType);
}
