package com.devpath.domain.learning.repository.recommendation;

import com.devpath.domain.learning.entity.recommendation.RecommendationHistory;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RecommendationHistoryRepository extends JpaRepository<RecommendationHistory, Long> {

    List<RecommendationHistory> findAllByUserIdOrderByCreatedAtDesc(Long userId);

    List<RecommendationHistory> findAllByUserIdAndRoadmapNodeNodeIdOrderByCreatedAtDesc(Long userId, Long nodeId);

    List<RecommendationHistory> findAllByUserIdAndRecommendationIdOrderByCreatedAtDesc(Long userId, Long recommendationId);
}
