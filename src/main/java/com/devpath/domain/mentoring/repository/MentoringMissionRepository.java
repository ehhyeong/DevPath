package com.devpath.domain.mentoring.repository;

import com.devpath.domain.mentoring.entity.MentoringMission;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MentoringMissionRepository extends JpaRepository<MentoringMission, Long> {

  // 같은 멘토링 안에서 같은 주차 미션이 중복 생성되는 것을 방지한다.
  boolean existsByMentoring_IdAndWeekNumberAndIsDeletedFalse(Long mentoringId, Integer weekNumber);

  // 수정 시 자기 자신을 제외하고 같은 주차가 이미 존재하는지 확인한다.
  boolean existsByMentoring_IdAndWeekNumberAndIdNotAndIsDeletedFalse(
      Long mentoringId, Integer weekNumber, Long missionId);

  // 멘토링 워크스페이스의 미션 목록을 주차 순서대로 조회한다.
  @EntityGraph(
      attributePaths = {"mentoring", "mentoring.post", "mentoring.mentor", "mentoring.mentee"})
  List<MentoringMission> findAllByMentoring_IdAndIsDeletedFalseOrderByWeekNumberAscCreatedAtAsc(
      Long mentoringId);

  // 미션 단건 조회에서 필요한 멘토링 정보를 함께 로딩한다.
  @EntityGraph(
      attributePaths = {"mentoring", "mentoring.post", "mentoring.mentor", "mentoring.mentee"})
  Optional<MentoringMission> findByIdAndIsDeletedFalse(Long id);

  // 멘토링 대시보드의 미션 개수 집계에 사용한다.
  long countByMentoring_IdAndIsDeletedFalse(Long mentoringId);
}
