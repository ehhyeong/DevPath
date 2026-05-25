package com.devpath.domain.roadmap.repository;

import com.devpath.domain.roadmap.entity.CustomRoadmap;
import com.devpath.domain.roadmap.entity.CustomRoadmapNode;
import com.devpath.domain.roadmap.entity.NodeStatus;
import com.devpath.domain.roadmap.entity.RoadmapNode;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CustomRoadmapNodeRepository extends JpaRepository<CustomRoadmapNode, Long> {

  List<CustomRoadmapNode> findAllByCustomRoadmap(CustomRoadmap customRoadmap);

  List<CustomRoadmapNode> findAllByCustomRoadmapOrderByOriginalNodeSortOrderAsc(
      CustomRoadmap customRoadmap);

  List<CustomRoadmapNode> findAllByCustomRoadmapOrderByCustomSortOrderAsc(
      CustomRoadmap customRoadmap);

  // customSortOrder >= targetOrder 인 노드 목록 (ADD 시 기존 노드 밀기용)
  List<CustomRoadmapNode> findAllByCustomRoadmapAndCustomSortOrderGreaterThanEqual(
      CustomRoadmap customRoadmap, Integer customSortOrder);

  Optional<CustomRoadmapNode> findByCustomRoadmapAndOriginalNode(
      CustomRoadmap customRoadmap, RoadmapNode originalNode);

  void deleteAllByCustomRoadmap(CustomRoadmap customRoadmap);

  @Query(
      "SELECT c FROM CustomRoadmapNode c WHERE c.originalNode.nodeId = :nodeId AND c.customRoadmap.user.id = :userId")
  List<CustomRoadmapNode> findAllByOriginalNodeIdAndUserId(
      @Param("nodeId") Long nodeId, @Param("userId") Long userId);

  @Query(
      """
      select distinct c.originalNode.nodeId
      from CustomRoadmapNode c
      where c.customRoadmap.user.id = :userId
        and c.originalNode is not null
      """)
  List<Long> findOriginalNodeIdsByUserId(@Param("userId") Long userId);

  @Query("SELECT COUNT(n) FROM CustomRoadmapNode n WHERE n.customRoadmap = :roadmap")
  long countByCustomRoadmap(@Param("roadmap") CustomRoadmap roadmap);

  @Query(
      "SELECT COUNT(n) FROM CustomRoadmapNode n WHERE n.customRoadmap = :roadmap AND n.status = :status")
  long countByCustomRoadmapAndStatus(
      @Param("roadmap") CustomRoadmap roadmap, @Param("status") NodeStatus status);
}
