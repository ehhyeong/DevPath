package com.devpath.domain.roadmap.repository;

import com.devpath.domain.roadmap.entity.Prerequisite;
import com.devpath.domain.roadmap.entity.RoadmapNode;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PrerequisiteRepository extends JpaRepository<Prerequisite, Long> {
  List<Prerequisite> findAllByNode(RoadmapNode node);

  List<Prerequisite> findAllByNodeRoadmapRoadmapId(Long roadmapId);
}
