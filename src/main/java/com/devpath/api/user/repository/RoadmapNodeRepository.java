package com.devpath.api.user.repository;

import com.devpath.domain.roadmap.entity.Roadmap;
import com.devpath.domain.roadmap.entity.RoadmapNode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RoadmapNodeRepository extends JpaRepository<RoadmapNode, Long> {
    // 특정 로드맵의 노드들을 순서(sortOrder)에 맞춰 오름차순으로 가져옵니다.
    List<RoadmapNode> findByRoadmapOrderBySortOrderAsc(Roadmap roadmap);
}