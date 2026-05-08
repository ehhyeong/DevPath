package com.devpath.domain.roadmap.repository;

import com.devpath.domain.roadmap.entity.Prerequisite;
import com.devpath.domain.roadmap.entity.RoadmapNode;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PrerequisiteRepository extends JpaRepository<Prerequisite, Long> {
  List<Prerequisite> findAllByNode(RoadmapNode node);

  List<Prerequisite> findAllByNodeRoadmapRoadmapId(Long roadmapId);

  void deleteAllByNode(RoadmapNode node);

  @Query(
      """
      select p.node.nodeId as nodeId, p.preNode.nodeId as prerequisiteNodeId
      from Prerequisite p
      where p.node.nodeId in :nodeIds
      order by p.node.nodeId asc, p.preNode.sortOrder asc, p.preNode.nodeId asc
      """)
  List<PrerequisiteNodeIdProjection> findPrerequisiteNodeIdsByNodeIds(
      @Param("nodeIds") Collection<Long> nodeIds);

  interface PrerequisiteNodeIdProjection {
    Long getNodeId();

    Long getPrerequisiteNodeId();
  }
}
