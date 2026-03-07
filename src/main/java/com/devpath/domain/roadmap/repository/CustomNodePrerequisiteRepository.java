package com.devpath.domain.roadmap.repository;

import com.devpath.domain.roadmap.entity.CustomNodePrerequisite;
import com.devpath.domain.roadmap.entity.CustomRoadmap;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CustomNodePrerequisiteRepository extends JpaRepository<CustomNodePrerequisite, Long> {
    void deleteAllByCustomRoadmap(CustomRoadmap customRoadmap);
}