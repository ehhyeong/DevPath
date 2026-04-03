package com.devpath.domain.project.repository;

import com.devpath.domain.project.entity.Project;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProjectRepository extends JpaRepository<Project, Long> {

    List<Project> findAllByIsDeletedFalseOrderByCreatedAtDesc();

    long countByIsDeletedFalse();

    List<Project> findTop3ByIsDeletedFalseOrderByCreatedAtDesc();

    Optional<Project> findByIdAndIsDeletedFalse(Long projectId);
}
