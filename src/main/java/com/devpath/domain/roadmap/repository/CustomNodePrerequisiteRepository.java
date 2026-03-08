package com.devpath.domain.roadmap.repository;

import com.devpath.domain.roadmap.entity.CustomNodePrerequisite;
import com.devpath.domain.roadmap.entity.CustomRoadmap;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CustomNodePrerequisiteRepository
    extends JpaRepository<CustomNodePrerequisite, Long> {
  List<CustomNodePrerequisite> findAllByCustomRoadmap(CustomRoadmap customRoadmap);

  void deleteAllByCustomRoadmap(CustomRoadmap customRoadmap);
}
