package com.devpath.domain.project.repository;

import com.devpath.domain.project.entity.MentoringApplication;
import com.devpath.domain.project.entity.MentoringApplicationStatus;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository("projectMentoringApplicationRepository")
public interface MentoringApplicationRepository extends JpaRepository<MentoringApplication, Long> {

  boolean existsByProjectIdAndMentorIdAndStatus(
      Long projectId, Long mentorId, MentoringApplicationStatus status);

  List<MentoringApplication> findAllByProjectIdInOrderByCreatedAtDesc(List<Long> projectIds);

  List<MentoringApplication> findAllByProjectIdOrderByCreatedAtDesc(Long projectId);
}
