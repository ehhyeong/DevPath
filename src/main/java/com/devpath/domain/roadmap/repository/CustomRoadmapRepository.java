package com.devpath.domain.roadmap.repository;

import com.devpath.domain.roadmap.entity.CustomRoadmap;
import com.devpath.domain.user.entity.User;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CustomRoadmapRepository extends JpaRepository<CustomRoadmap, Long> {
  List<CustomRoadmap> findAllByUserOrderByCreatedAtDesc(User user);

  boolean existsByUserIdAndOriginalRoadmapRoadmapId(Long userId, Long roadmapId);

  long countByUserIdAndOriginalRoadmapRoadmapId(Long userId, Long roadmapId);
}
