package com.devpath.api.user.repository;

import com.devpath.domain.roadmap.entity.Prerequisite;
import com.devpath.domain.roadmap.entity.RoadmapNode;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PrerequisiteRepository extends JpaRepository<Prerequisite, Long> {
    // 특정 노드를 듣기 위해 먼저 들어야 하는 노드 목록 조회
    List<Prerequisite> findAllByNode(RoadmapNode node);
}