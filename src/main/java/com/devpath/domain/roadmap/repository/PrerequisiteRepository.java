package com.devpath.domain.roadmap.repository;

import com.devpath.domain.roadmap.entity.Prerequisite;
import com.devpath.domain.roadmap.entity.RoadmapNode;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PrerequisiteRepository extends JpaRepository<Prerequisite, Long> {
    List<Prerequisite> findAllByNode(RoadmapNode node);
}
