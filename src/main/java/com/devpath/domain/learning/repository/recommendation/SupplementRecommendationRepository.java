package com.devpath.domain.learning.repository.recommendation;

import com.devpath.domain.learning.entity.recommendation.SupplementRecommendation;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SupplementRecommendationRepository extends JpaRepository<SupplementRecommendation, Long> {

    List<SupplementRecommendation> findAllByUserIdOrderByCreatedAtDesc(Long userId);

    Optional<SupplementRecommendation> findTopByUserIdAndRoadmapNodeNodeIdOrderByCreatedAtDesc(Long userId, Long nodeId);
}
