package com.devpath.domain.ai.repository;

import com.devpath.domain.ai.entity.AiReviewComment;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AiReviewCommentRepository extends JpaRepository<AiReviewComment, Long> {

  // 특정 AI 코드 리뷰의 코멘트 목록을 생성 순서대로 조회한다.
  @EntityGraph(attributePaths = "aiCodeReview")
  List<AiReviewComment> findAllByAiCodeReview_IdAndIsDeletedFalseOrderByCreatedAtAsc(Long reviewId);

  // 코멘트 승인/반려 시 리뷰와 요청자 정보를 함께 로딩한다.
  @EntityGraph(attributePaths = {"aiCodeReview", "aiCodeReview.requester"})
  Optional<AiReviewComment> findByIdAndIsDeletedFalse(Long id);
}
