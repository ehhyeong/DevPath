package com.devpath.domain.learning.repository.clearance;

import com.devpath.domain.learning.entity.clearance.ClearanceStatus;
import com.devpath.domain.learning.entity.clearance.NodeClearance;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NodeClearanceRepository extends JpaRepository<NodeClearance, Long> {

    Optional<NodeClearance> findByUserIdAndNodeNodeId(Long userId, Long nodeId);

    List<NodeClearance> findAllByUserIdAndNodeRoadmapRoadmapIdOrderByNodeSortOrderAscNodeNodeIdAsc(
            Long userId,
            Long roadmapId
    );

    List<NodeClearance> findAllByUserIdOrderByLastCalculatedAtDesc(Long userId);

    List<NodeClearance> findAllByUserIdAndClearanceStatusOrderByClearedAtDesc(
            Long userId,
            ClearanceStatus clearanceStatus
    );

    long countByUserIdAndClearanceStatus(Long userId, ClearanceStatus clearanceStatus);
}
