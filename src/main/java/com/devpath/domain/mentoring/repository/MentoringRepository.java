package com.devpath.domain.mentoring.repository;

import com.devpath.domain.mentoring.entity.Mentoring;
import com.devpath.domain.mentoring.entity.MentoringStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MentoringRepository extends JpaRepository<Mentoring, Long> {

  // 진행 중 멘토링 목록 조회에서 공고, 멘토, 멘티 정보를 함께 사용한다.
  @EntityGraph(attributePaths = {"post", "mentor", "mentee"})
  List<Mentoring> findAllByStatusAndIsDeletedFalseOrderByCreatedAtDesc(MentoringStatus status);

  // 멘토 기준 내 멘토링 조회에 사용한다.
  @EntityGraph(attributePaths = {"post", "mentor", "mentee"})
  List<Mentoring> findAllByMentor_IdAndIsDeletedFalseOrderByCreatedAtDesc(Long mentorId);

  // 멘티 기준 내 멘토링 조회에 사용한다.
  @EntityGraph(attributePaths = {"post", "mentor", "mentee"})
  List<Mentoring> findAllByMentee_IdAndIsDeletedFalseOrderByCreatedAtDesc(Long menteeId);

  // 워크스페이스와 대시보드 조회에서 필요한 연관 정보를 함께 로딩한다.
  @EntityGraph(attributePaths = {"post", "mentor", "mentee"})
  Optional<Mentoring> findByIdAndIsDeletedFalse(Long id);
}
