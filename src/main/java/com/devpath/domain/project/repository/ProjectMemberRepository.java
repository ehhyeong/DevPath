package com.devpath.domain.project.repository;

import com.devpath.domain.project.entity.ProjectMember;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProjectMemberRepository extends JpaRepository<ProjectMember, Long> {

  boolean existsByProjectIdAndLearnerId(Long projectId, Long learnerId);

  Optional<ProjectMember> findByProjectIdAndLearnerId(Long projectId, Long learnerId);

  List<ProjectMember> findAllByProjectId(Long projectId);

  List<ProjectMember> findAllByLearnerIdOrderByJoinedAtDesc(Long learnerId);
}
