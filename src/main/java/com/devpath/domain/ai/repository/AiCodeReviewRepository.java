package com.devpath.domain.ai.repository;

import com.devpath.domain.ai.entity.AiCodeReview;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AiCodeReviewRepository extends JpaRepository<AiCodeReview, Long> {

  // AI 리뷰 단건 조회에서 요청자와 PR 정보를 함께 사용한다.
  @EntityGraph(
      attributePaths = {
        "requester",
        "pullRequestSubmission",
        "pullRequestSubmission.missionSubmission",
        "pullRequestSubmission.missionSubmission.mission"
      })
  Optional<AiCodeReview> findByIdAndIsDeletedFalse(Long id);

  // 특정 사용자의 AI 리뷰 히스토리를 최신순으로 조회한다.
  @EntityGraph(
      attributePaths = {
        "requester",
        "pullRequestSubmission",
        "pullRequestSubmission.missionSubmission",
        "pullRequestSubmission.missionSubmission.mission"
      })
  List<AiCodeReview> findAllByRequester_IdAndIsDeletedFalseOrderByCreatedAtDesc(Long requesterId);
}
