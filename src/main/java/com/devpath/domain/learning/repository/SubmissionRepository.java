package com.devpath.domain.learning.repository;

import com.devpath.domain.learning.entity.Submission;
import com.devpath.domain.learning.entity.SubmissionStatus;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SubmissionRepository extends JpaRepository<Submission, Long> {

  Optional<Submission> findByIdAndIsDeletedFalse(Long id);

  List<Submission> findAllByAssignmentIdAndIsDeletedFalseOrderBySubmittedAtDesc(Long assignmentId);

  List<Submission> findAllByLearnerIdAndIsDeletedFalseOrderBySubmittedAtDesc(Long learnerId);

  Optional<Submission> findTopByAssignmentIdAndLearnerIdAndIsDeletedFalseOrderBySubmittedAtDesc(
      Long assignmentId, Long learnerId);

  List<Submission> findAllByAssignmentIdAndSubmissionStatusAndIsDeletedFalseOrderBySubmittedAtDesc(
      Long assignmentId, SubmissionStatus submissionStatus);

  @Query(
      """
        select s
        from Submission s
        join fetch s.assignment a
        join fetch a.roadmapNode rn
        join fetch s.learner l
        where s.isDeleted = false
          and rn.nodeId in :nodeIds
        order by s.submittedAt desc
        """)
  List<Submission> findAllByAssignmentRoadmapNodeNodeIdInAndIsDeletedFalseOrderBySubmittedAtDesc(
      @Param("nodeIds") Collection<Long> nodeIds);
}
