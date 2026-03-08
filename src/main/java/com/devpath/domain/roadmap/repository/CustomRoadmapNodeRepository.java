package com.devpath.domain.roadmap.repository;

import com.devpath.domain.roadmap.entity.CustomRoadmap;
import com.devpath.domain.roadmap.entity.CustomRoadmapNode;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CustomRoadmapNodeRepository extends JpaRepository<CustomRoadmapNode, Long> {
  List<CustomRoadmapNode> findAllByCustomRoadmap(CustomRoadmap customRoadmap);

  List<CustomRoadmapNode> findAllByCustomRoadmapOrderByOriginalNodeSortOrderAsc(
      CustomRoadmap customRoadmap);

  void deleteAllByCustomRoadmap(CustomRoadmap customRoadmap);
}
