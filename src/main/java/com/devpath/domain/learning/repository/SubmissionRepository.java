package com.devpath.domain.learning.repository;

import com.devpath.domain.learning.entity.Submission;
import com.devpath.domain.learning.entity.SubmissionStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SubmissionRepository extends JpaRepository<Submission, Long> {

    // soft delete 되지 않은 제출을 id 기준으로 단건 조회한다.
    Optional<Submission> findByIdAndIsDeletedFalse(Long id);

    // 특정 과제의 제출 목록을 제출 시각 최신순으로 조회한다.
    List<Submission> findAllByAssignmentIdAndIsDeletedFalseOrderBySubmittedAtDesc(Long assignmentId);

    // 특정 학습자의 제출 이력을 제출 시각 최신순으로 조회한다.
    List<Submission> findAllByLearnerIdAndIsDeletedFalseOrderBySubmittedAtDesc(Long learnerId);

    // 특정 과제와 특정 학습자 기준으로 가장 최근 제출 1건을 조회한다.
    Optional<Submission> findTopByAssignmentIdAndLearnerIdAndIsDeletedFalseOrderBySubmittedAtDesc(
            Long assignmentId,
            Long learnerId
    );

    // 특정 과제에서 특정 상태를 가진 제출 목록을 제출 시각 최신순으로 조회한다.
    List<Submission> findAllByAssignmentIdAndSubmissionStatusAndIsDeletedFalseOrderBySubmittedAtDesc(
            Long assignmentId,
            SubmissionStatus submissionStatus
    );
}
