package com.devpath.domain.showcase.repository;

import com.devpath.domain.showcase.entity.ShowcaseLike;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ShowcaseLikeRepository extends JpaRepository<ShowcaseLike, Long> {

  boolean existsByShowcaseIdAndUserId(Long showcaseId, Long userId);

  long countByShowcaseId(Long showcaseId);

  void deleteByShowcaseIdAndUserId(Long showcaseId, Long userId);
}
