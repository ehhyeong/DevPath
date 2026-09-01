package com.devpath.domain.admin.repository;

import com.devpath.domain.admin.entity.BlindedContent;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BlindedContentRepository extends JpaRepository<BlindedContent, Long> {

  Optional<BlindedContent> findByContentIdAndIsActiveTrue(Long contentId);

  long countByIsActiveTrue();
}
