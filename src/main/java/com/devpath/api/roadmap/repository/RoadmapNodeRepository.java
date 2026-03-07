package com.devpath.api.roadmap.repository;

import com.devpath.domain.roadmap.entity.RoadmapNode;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RoadmapNodeRepository extends JpaRepository<RoadmapNode, Long> {

    List<RoadmapNode> findAllByRoadmapId(Long roadmapId);
}