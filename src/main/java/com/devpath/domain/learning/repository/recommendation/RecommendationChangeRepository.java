package com.devpath.domain.learning.repository.recommendation;

import com.devpath.domain.learning.entity.recommendation.RecommendationChange;
import com.devpath.domain.learning.entity.recommendation.RecommendationChangeStatus;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RecommendationChangeRepository extends JpaRepository<RecommendationChange, Long> {

  List<RecommendationChange> findAllByUserIdOrderByCreatedAtDesc(Long userId);

  List<RecommendationChange> findAllByUserIdAndChangeStatusOrderByCreatedAtDesc(
      Long userId, RecommendationChangeStatus changeStatus);

  List<RecommendationChange> findAllByUserIdAndChangeStatusInOrderByUpdatedAtDesc(
      Long userId, Collection<RecommendationChangeStatus> changeStatuses);

  List<RecommendationChange>
      findAllByUserIdAndTargetCustomRoadmapIdAndChangeStatusOrderByCreatedAtDesc(
          Long userId, Long targetCustomRoadmapId, RecommendationChangeStatus changeStatus);

  List<RecommendationChange>
      findAllByUserIdAndTargetCustomRoadmapIdAndChangeStatusInOrderByUpdatedAtDesc(
          Long userId, Long targetCustomRoadmapId, Collection<RecommendationChangeStatus> changeStatuses);

  // 로드맵 X에 속한 추천: 추천 노드가 X에 있거나(보강/DELETE), 분기 기준 노드(branchFromNodeId)가 X에 있는(진단) 경우 모두 포함.
  // 진단 추천 노드는 시스템 동적 로드맵에 저장되므로 branchFromNode 기준으로도 매칭한다.
  @Query(
      """
      select rc
      from RecommendationChange rc
      where rc.user.id = :userId
        and rc.changeStatus in :changeStatuses
        and (
          rc.roadmapNode.roadmap.roadmapId = :roadmapId
          or exists (
            select 1 from RoadmapNode bn
            where bn.nodeId = rc.branchFromNodeId
              and bn.roadmap.roadmapId = :roadmapId
          )
        )
      order by rc.updatedAt desc
      """)
  List<RecommendationChange>
      findAllByUserIdAndRoadmapNodeRoadmapRoadmapIdAndChangeStatusInOrderByUpdatedAtDesc(
          @Param("userId") Long userId,
          @Param("roadmapId") Long roadmapId,
          @Param("changeStatuses") Collection<RecommendationChangeStatus> changeStatuses);

  Optional<RecommendationChange> findByIdAndUserId(Long changeId, Long userId);

  Optional<RecommendationChange>
      findTopByUserIdAndRoadmapNodeNodeIdAndChangeStatusOrderByCreatedAtDesc(
          Long userId, Long nodeId, RecommendationChangeStatus changeStatus);

  // (단일 상태판) 로드맵 X 추천: 추천 노드 X 소속 OR 분기 기준 노드(branchFromNodeId) X 소속.
  @Query(
      """
      select rc
      from RecommendationChange rc
      where rc.user.id = :userId
        and rc.changeStatus = :changeStatus
        and (
          rc.roadmapNode.roadmap.roadmapId = :roadmapId
          or exists (
            select 1 from RoadmapNode bn
            where bn.nodeId = rc.branchFromNodeId
              and bn.roadmap.roadmapId = :roadmapId
          )
        )
      order by rc.createdAt desc
      """)
  List<RecommendationChange>
      findAllByUserIdAndRoadmapNodeRoadmapRoadmapIdAndChangeStatusOrderByCreatedAtDesc(
          @Param("userId") Long userId,
          @Param("roadmapId") Long roadmapId,
          @Param("changeStatus") RecommendationChangeStatus changeStatus);
}
