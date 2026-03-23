package com.devpath.domain.learning.repository;

import com.devpath.domain.learning.entity.TilDraft;
import com.devpath.domain.learning.entity.TilDraftStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TilDraftRepository extends JpaRepository<TilDraft, Long> {

    List<TilDraft> findByUserIdAndIsDeletedFalseOrderByCreatedAtDesc(Long userId);

    List<TilDraft> findByUserIdAndLessonLessonIdAndIsDeletedFalse(Long userId, Long lessonId);

    Optional<TilDraft> findByIdAndUserIdAndIsDeletedFalse(Long tilId, Long userId);

    List<TilDraft> findByUserIdAndStatusAndIsDeletedFalse(Long userId, TilDraftStatus status);

    long countByUserIdAndIsDeletedFalse(Long userId);

    long countByUserIdAndStatusAndIsDeletedFalse(Long userId, TilDraftStatus status);

    long countByUserIdAndLessonLessonIdAndIsDeletedFalse(Long userId, Long lessonId);
}
