package com.devpath.domain.showcase.repository;

import com.devpath.domain.showcase.entity.ShowcaseLink;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ShowcaseLinkRepository extends JpaRepository<ShowcaseLink, Long> {

  List<ShowcaseLink> findAllByShowcaseId(Long showcaseId);

  void deleteAllByShowcaseId(Long showcaseId);
}
