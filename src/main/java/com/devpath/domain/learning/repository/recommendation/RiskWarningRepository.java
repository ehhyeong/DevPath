package com.devpath.domain.learning.repository.recommendation;

import com.devpath.domain.learning.entity.recommendation.RiskWarning;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RiskWarningRepository extends JpaRepository<RiskWarning, Long> {

    List<RiskWarning> findAllByUserIdOrderByCreatedAtDesc(Long userId);

    List<RiskWarning> findAllByUserIdAndIsAcknowledgedFalseOrderByCreatedAtDesc(Long userId);

    List<RiskWarning> findAllByUserIdAndRoadmapNodeNodeIdOrderByCreatedAtDesc(Long userId, Long nodeId);
}
