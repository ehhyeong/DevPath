package com.devpath.api.admin.repository;

import com.devpath.api.admin.entity.BlindedContent;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BlindedContentRepository extends JpaRepository<BlindedContent, Long> {

    Optional<BlindedContent> findByContentIdAndIsActiveTrue(Long contentId);

    long countByIsActiveTrue();
}
