package com.devpath.domain.roadmap.repository;

import com.devpath.domain.roadmap.entity.CustomRoadmap;
import com.devpath.domain.roadmap.entity.CustomRoadmapNode;
import com.devpath.domain.roadmap.entity.RoadmapNode;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CustomRoadmapNodeRepository extends JpaRepository<CustomRoadmapNode, Long> {
  List<CustomRoadmapNode> findAllByCustomRoadmap(CustomRoadmap customRoadmap);

  List<CustomRoadmapNode> findAllByCustomRoadmapOrderByOriginalNodeSortOrderAsc(
      CustomRoadmap customRoadmap);

  Optional<CustomRoadmapNode> findByCustomRoadmapAndOriginalNode(
      CustomRoadmap customRoadmap, RoadmapNode originalNode);

  void deleteAllByCustomRoadmap(CustomRoadmap customRoadmap);
}
