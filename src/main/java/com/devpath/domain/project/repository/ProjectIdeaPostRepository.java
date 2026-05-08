package com.devpath.domain.project.repository;

import com.devpath.domain.project.entity.ProjectIdeaPost;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProjectIdeaPostRepository extends JpaRepository<ProjectIdeaPost, Long> {

  List<ProjectIdeaPost> findAllByIsDeletedFalseOrderByCreatedAtDesc();

  Optional<ProjectIdeaPost> findByIdAndIsDeletedFalse(Long ideaId);
}
