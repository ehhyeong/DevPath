package com.devpath.domain.project.repository;

import com.devpath.domain.project.entity.ProjectProofSubmission;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProjectProofSubmissionRepository
    extends JpaRepository<ProjectProofSubmission, Long> {

  boolean existsByProjectIdAndProofCardRefId(Long projectId, String proofCardRefId);

  List<ProjectProofSubmission> findAllByProjectIdOrderBySubmittedAtDesc(Long projectId);
}
