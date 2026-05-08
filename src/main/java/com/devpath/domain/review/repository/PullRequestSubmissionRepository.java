package com.devpath.domain.review.repository;

import com.devpath.domain.review.entity.PullRequestSubmission;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PullRequestSubmissionRepository
    extends JpaRepository<PullRequestSubmission, Long> {

  // 멘토링별 PR 제출 목록을 최신순으로 조회한다.
  @EntityGraph(
      attributePaths = {
        "missionSubmission",
        "missionSubmission.mission",
        "missionSubmission.mission.mentoring",
        "missionSubmission.mission.mentoring.post",
        "missionSubmission.mission.mentoring.mentor",
        "missionSubmission.mission.mentoring.mentee",
        "missionSubmission.submitter"
      })
  List<PullRequestSubmission>
      findAllByMissionSubmission_Mission_Mentoring_IdAndIsDeletedFalseOrderByCreatedAtDesc(
          Long mentoringId);

  // PR 단건 조회와 리뷰 작성 시 필요한 연관 정보를 함께 로딩한다.
  @EntityGraph(
      attributePaths = {
        "missionSubmission",
        "missionSubmission.mission",
        "missionSubmission.mission.mentoring",
        "missionSubmission.mission.mentoring.post",
        "missionSubmission.mission.mentoring.mentor",
        "missionSubmission.mission.mentoring.mentee",
        "missionSubmission.submitter"
      })
  Optional<PullRequestSubmission> findByIdAndIsDeletedFalse(Long id);

  // 멘토링 워크스페이스 대시보드의 PR 제출 개수 집계에 사용한다.
  long countByMissionSubmission_Mission_Mentoring_IdAndIsDeletedFalse(Long mentoringId);
}
