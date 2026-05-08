package com.devpath.domain.ai.repository;

import com.devpath.domain.ai.entity.AiDesignSuggestion;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AiDesignSuggestionRepository extends JpaRepository<AiDesignSuggestion, Long> {

  // 특정 AI 설계 리뷰의 개선 제안 목록을 생성순으로 조회한다.
  @EntityGraph(attributePaths = {"designReview", "createdBy"})
  List<AiDesignSuggestion> findAllByDesignReview_IdAndIsDeletedFalseOrderByCreatedAtAsc(
      Long reviewId);
}
