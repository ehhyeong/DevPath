package com.devpath.domain.roadmap.repository;

import com.devpath.domain.roadmap.entity.Roadmap;
import com.devpath.domain.roadmap.entity.RoadmapNode;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface RoadmapNodeRepository extends JpaRepository<RoadmapNode, Long> {
  List<RoadmapNode> findAllByRoadmapRoadmapId(Long roadmapId);

  List<RoadmapNode> findByRoadmapOrderBySortOrderAsc(Roadmap roadmap);

  @EntityGraph(attributePaths = "roadmap")
  @Query(
      """
            select rn
            from RoadmapNode rn
            join rn.roadmap r
            where r.isOfficial = true
              and r.isPublic = true
              and r.isDeleted = false
            order by r.roadmapId asc, rn.sortOrder asc, rn.nodeId asc
            """)
  List<RoadmapNode> findAllOfficialPublicNodes();
}
