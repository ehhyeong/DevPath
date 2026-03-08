package com.devpath.domain.roadmap.repository;

import com.devpath.domain.roadmap.entity.Roadmap;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RoadmapRepository extends JpaRepository<Roadmap, Long> {
    Optional<Roadmap> findByRoadmapIdAndIsDeletedFalse(Long roadmapId);

    List<Roadmap> findAllByIsOfficialTrueAndIsDeletedFalse();

    Optional<Roadmap> findByRoadmapIdAndIsOfficialTrueAndIsDeletedFalse(Long roadmapId);
}
