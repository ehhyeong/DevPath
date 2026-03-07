package com.devpath.api.roadmap.repository;

import com.devpath.domain.roadmap.entity.Roadmap;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RoadmapRepository extends JpaRepository<Roadmap, Long> {
}