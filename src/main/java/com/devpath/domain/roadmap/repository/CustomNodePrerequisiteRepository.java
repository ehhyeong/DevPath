package com.devpath.domain.roadmap.repository;

import com.devpath.domain.roadmap.entity.CustomNodePrerequisite;
import com.devpath.domain.roadmap.entity.CustomRoadmap;
import com.devpath.domain.roadmap.entity.CustomRoadmapNode;
import com.devpath.domain.roadmap.entity.NodeStatus;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CustomNodePrerequisiteRepository
    extends JpaRepository<CustomNodePrerequisite, Long> {
  List<CustomNodePrerequisite> findAllByCustomRoadmap(CustomRoadmap customRoadmap);

  List<CustomNodePrerequisite> findAllByCustomNode(CustomRoadmapNode customNode);

  @Query(
      "SELECT COUNT(p) FROM CustomNodePrerequisite p "
          + "WHERE p.customNode = :node "
          + "AND p.prerequisiteCustomNode.status <> :status")
  long countByCustomNodeAndPrerequisiteNotCompleted(
      @Param("node") CustomRoadmapNode node, @Param("status") NodeStatus status);

  void deleteAllByCustomRoadmap(CustomRoadmap customRoadmap);

  /** 삭제 대상 노드가 subject이거나 prerequisite인 레코드를 모두 제거 */
  @Modifying
  @Query(
      "DELETE FROM CustomNodePrerequisite c WHERE c.customNode = :node OR c.prerequisiteCustomNode = :node")
  void deleteAllByCustomNodeOrPrerequisiteCustomNode(@Param("node") CustomRoadmapNode node);
}
