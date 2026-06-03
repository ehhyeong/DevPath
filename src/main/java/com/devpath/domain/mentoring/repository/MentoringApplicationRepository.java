package com.devpath.domain.mentoring.repository;

import com.devpath.domain.mentoring.entity.MentoringApplication;
import com.devpath.domain.mentoring.entity.MentoringApplicationStatus;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MentoringApplicationRepository extends JpaRepository<MentoringApplication, Long> {

  // 같은 공고에 같은 사용자가 중복 신청하는 것을 방지한다.
  boolean existsByPost_IdAndApplicant_IdAndIsDeletedFalse(Long postId, Long applicantId);

  // 보낸 신청 목록에서 공고와 멘토 정보를 함께 사용하므로 EntityGraph로 N+1 가능성을 줄인다.
  @EntityGraph(attributePaths = {"post", "post.mentor", "applicant"})
  List<MentoringApplication> findAllByApplicant_IdAndIsDeletedFalseOrderByCreatedAtDesc(
      Long applicantId);

  // 받은 신청 목록에서 공고 작성자인 멘토 기준으로 신청서를 조회한다.
  @EntityGraph(attributePaths = {"post", "post.mentor", "applicant"})
  List<MentoringApplication> findAllByPost_Mentor_IdAndIsDeletedFalseOrderByCreatedAtDesc(
      Long mentorId);

  @EntityGraph(attributePaths = {"post", "post.mentor", "applicant"})
  List<MentoringApplication> findAllByPost_Mentor_IdAndStatusAndIsDeletedFalseOrderByCreatedAtDesc(
      Long mentorId, MentoringApplicationStatus status);

  // 신청 상세와 상태 조회에서 Soft Delete 된 신청은 제외한다.
  @EntityGraph(attributePaths = {"post", "post.mentor", "applicant"})
  Optional<MentoringApplication> findByIdAndIsDeletedFalse(Long id);

  @EntityGraph(attributePaths = {"post", "post.mentor", "applicant"})
  List<MentoringApplication> findAllByPost_IdAndStatusAndIsDeletedFalseOrderByProcessedAtDesc(
      Long postId, MentoringApplicationStatus status);

  @EntityGraph(attributePaths = {"post", "post.mentor", "applicant"})
  List<MentoringApplication>
      findAllByPost_Mentor_IdAndApplicant_IdInAndStatusAndIsDeletedFalseOrderByProcessedAtDesc(
          Long mentorId, Collection<Long> applicantIds, MentoringApplicationStatus status);
}
