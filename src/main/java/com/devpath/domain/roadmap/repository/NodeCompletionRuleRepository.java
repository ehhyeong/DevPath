package com.devpath.domain.roadmap.repository;

import com.devpath.domain.roadmap.entity.NodeCompletionRule;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NodeCompletionRuleRepository extends JpaRepository<NodeCompletionRule, Long> {
  Optional<NodeCompletionRule> findByNodeNodeId(Long nodeId);
}
