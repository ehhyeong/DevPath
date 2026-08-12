package com.devpath.domain.roadmap.repository;

import com.devpath.domain.roadmap.entity.RoadmapNodeResource;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RoadmapNodeResourceRepository extends JpaRepository<RoadmapNodeResource, Long> {

  @EntityGraph(attributePaths = {"node", "node.roadmap"})
  @Query(
      """
          select resource
          from RoadmapNodeResource resource
          join resource.node node
          join node.roadmap roadmap
          where roadmap.isOfficial = true
            and roadmap.isPublic = true
            and roadmap.isDeleted = false
          order by roadmap.title asc,
                   node.sortOrder asc,
                   node.nodeId asc,
                   resource.sortOrder asc,
                   resource.resourceId asc
          """)
  List<RoadmapNodeResource> findAllForAdmin();

  @EntityGraph(attributePaths = {"node"})
  @Query(
      """
          select resource
          from RoadmapNodeResource resource
          where resource.node.nodeId in :nodeIds
            and resource.active = true
          order by resource.node.nodeId asc,
                   resource.sortOrder asc,
                   resource.resourceId asc
          """)
  List<RoadmapNodeResource> findActiveByNodeIds(@Param("nodeIds") List<Long> nodeIds);

  void deleteAllByNodeNodeId(Long nodeId);
}
