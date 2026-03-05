package com.devpath.domain.roadmap.repository;

import com.devpath.domain.roadmap.entity.CustomRoadmap;
import com.devpath.domain.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CustomRoadmapRepository extends JpaRepository<CustomRoadmap, Long> {
    List<CustomRoadmap> findAllByUserOrderByCreatedAtDesc(User user);
}