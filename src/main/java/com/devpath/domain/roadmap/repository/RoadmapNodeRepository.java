package com.devpath.domain.roadmap.repository;

import com.devpath.domain.roadmap.entity.Roadmap;
import com.devpath.domain.roadmap.entity.RoadmapNode;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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

  @EntityGraph(attributePaths = "roadmap")
  @Query(
      """
            select rn
            from RoadmapNode rn
            join rn.roadmap r
            where rn.nodeType = :nodeType
              and rn.subTopics in :subTopics
              and rn.branchGroup in :branchGroups
              and r.isOfficial = true
              and r.isPublic = true
              and r.isDeleted = false
            order by rn.nodeId asc
            """)
  List<RoadmapNode> findOfficialPublicNodesByNodeTypeAndSubTopicsInAndBranchGroupIn(
      @Param("nodeType") String nodeType,
      @Param("subTopics") Collection<String> subTopics,
      @Param("branchGroups") Collection<Integer> branchGroups);
}
