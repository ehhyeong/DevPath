package com.devpath.api.user.repository;

import com.devpath.domain.roadmap.entity.Roadmap;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RoadmapRepository extends JpaRepository<Roadmap, Long> {
    Optional<Roadmap> findByRoadmapIdAndIsDeletedFalse(Long roadmapId);

    // [추가] 오피셜 로드맵 전체 목록 조회 (삭제되지 않은 것만)
    List<Roadmap> findAllByIsOfficialTrueAndIsDeletedFalse();

    // [추가] 특정 오피셜 로드맵 단건 조회 (삭제되지 않은 것만)
    Optional<Roadmap> findByRoadmapIdAndIsOfficialTrueAndIsDeletedFalse(Long roadmapId);
}