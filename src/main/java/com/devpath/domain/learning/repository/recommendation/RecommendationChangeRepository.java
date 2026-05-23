package com.devpath.domain.learning.repository.recommendation;

import com.devpath.domain.learning.entity.recommendation.RecommendationChange;
import com.devpath.domain.learning.entity.recommendation.RecommendationChangeStatus;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RecommendationChangeRepository extends JpaRepository<RecommendationChange, Long> {

  List<RecommendationChange> findAllByUserIdOrderByCreatedAtDesc(Long userId);

  List<RecommendationChange> findAllByUserIdAndChangeStatusOrderByCreatedAtDesc(
      Long userId, RecommendationChangeStatus changeStatus);

  List<RecommendationChange> findAllByUserIdAndChangeStatusInOrderByUpdatedAtDesc(
      Long userId, Collection<RecommendationChangeStatus> changeStatuses);

  List<RecommendationChange>
      findAllByUserIdAndRoadmapNodeRoadmapRoadmapIdAndChangeStatusInOrderByUpdatedAtDesc(
          Long userId, Long roadmapId, Collection<RecommendationChangeStatus> changeStatuses);

  Optional<RecommendationChange> findByIdAndUserId(Long changeId, Long userId);

  Optional<RecommendationChange>
      findTopByUserIdAndRoadmapNodeNodeIdAndChangeStatusOrderByCreatedAtDesc(
          Long userId, Long nodeId, RecommendationChangeStatus changeStatus);

  List<RecommendationChange>
      findAllByUserIdAndRoadmapNodeRoadmapRoadmapIdAndChangeStatusOrderByCreatedAtDesc(
          Long userId, Long roadmapId, RecommendationChangeStatus changeStatus);
}
