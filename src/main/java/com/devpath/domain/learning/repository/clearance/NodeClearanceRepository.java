package com.devpath.domain.learning.repository.clearance;

import com.devpath.domain.learning.entity.clearance.NodeClearance;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

// 노드 클리어 결과 저장소다.
public interface NodeClearanceRepository extends JpaRepository<NodeClearance, Long> {

    // 특정 학습자의 특정 노드 클리어 결과를 조회한다.
    Optional<NodeClearance> findByUserIdAndNodeNodeId(Long userId, Long nodeId);

    // 특정 학습자의 특정 로드맵 노드 클리어 목록을 조회한다.
    List<NodeClearance> findAllByUserIdAndNodeRoadmapRoadmapIdOrderByNodeSortOrderAscNodeNodeIdAsc(
        Long userId,
        Long roadmapId
    );

    // 특정 학습자의 전체 노드 클리어 목록을 최근 계산순으로 조회한다.
    List<NodeClearance> findAllByUserIdOrderByLastCalculatedAtDesc(Long userId);
}
