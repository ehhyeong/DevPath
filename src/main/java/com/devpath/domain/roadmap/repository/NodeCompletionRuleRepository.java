package com.devpath.domain.roadmap.repository;

import com.devpath.domain.roadmap.entity.NodeCompletionRule;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NodeCompletionRuleRepository extends JpaRepository<NodeCompletionRule, Long> {
  // 단일 노드 수정 시 현재 완료 규칙 한 건을 조회한다.
  Optional<NodeCompletionRule> findByNodeNodeId(Long nodeId);

  // 관리자 표를 그릴 때 여러 노드의 완료 규칙을 한 번에 읽는다.
  List<NodeCompletionRule> findAllByNodeNodeIdIn(Collection<Long> nodeIds);

  void deleteAllByNodeNodeId(Long nodeId);
}
