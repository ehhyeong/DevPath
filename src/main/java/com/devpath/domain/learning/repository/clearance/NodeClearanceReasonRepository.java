package com.devpath.domain.learning.repository.clearance;

import com.devpath.domain.learning.entity.clearance.NodeClearanceReason;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

// 노드 클리어 판정 근거 저장소다.
public interface NodeClearanceReasonRepository extends JpaRepository<NodeClearanceReason, Long> {

    // 특정 노드 클리어 결과의 근거 목록을 조회한다.
    List<NodeClearanceReason> findAllByNodeClearanceIdOrderByIdAsc(Long nodeClearanceId);

    // 특정 노드 클리어 결과의 기존 근거를 전부 삭제한다.
    void deleteAllByNodeClearanceId(Long nodeClearanceId);
}
