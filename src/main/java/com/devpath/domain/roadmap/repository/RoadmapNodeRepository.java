package com.devpath.domain.roadmap.repository;

import com.devpath.domain.roadmap.entity.Roadmap;
import com.devpath.domain.roadmap.entity.RoadmapNode;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RoadmapNodeRepository extends JpaRepository<RoadmapNode, Long> {
  List<RoadmapNode> findAllByRoadmapRoadmapId(Long roadmapId);

  List<RoadmapNode> findByRoadmapOrderBySortOrderAsc(Roadmap roadmap);
}
