package com.devpath.domain.roadmap.repository;

import com.devpath.domain.roadmap.entity.CustomRoadmap;
import com.devpath.domain.roadmap.entity.CustomRoadmapNode;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CustomRoadmapNodeRepository extends JpaRepository<CustomRoadmapNode, Long> {
    List<CustomRoadmapNode> findAllByCustomRoadmap(CustomRoadmap customRoadmap);
    void deleteAllByCustomRoadmap(CustomRoadmap customRoadmap);
}