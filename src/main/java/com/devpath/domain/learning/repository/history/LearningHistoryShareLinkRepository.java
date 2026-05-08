package com.devpath.domain.learning.repository.history;

import com.devpath.domain.learning.entity.history.LearningHistoryShareLink;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LearningHistoryShareLinkRepository
    extends JpaRepository<LearningHistoryShareLink, Long> {

  Optional<LearningHistoryShareLink> findByShareTokenAndIsActiveTrue(String shareToken);

  Optional<LearningHistoryShareLink> findTopByUserIdAndIsActiveTrueOrderByIdDesc(Long userId);

  boolean existsByShareToken(String shareToken);
}
