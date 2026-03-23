package com.devpath.domain.learning.repository;

import com.devpath.domain.learning.entity.TimestampNote;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TimestampNoteRepository extends JpaRepository<TimestampNote, Long> {

    List<TimestampNote> findByUserIdAndLessonLessonIdAndIsDeletedFalseOrderByTimestampSecondAsc(
            Long userId,
            Long lessonId
    );

    long countByUserIdAndIsDeletedFalse(Long userId);

    long countByUserIdAndLessonLessonIdAndIsDeletedFalse(Long userId, Long lessonId);

    Optional<TimestampNote> findByIdAndUserIdAndIsDeletedFalse(Long noteId, Long userId);
}
