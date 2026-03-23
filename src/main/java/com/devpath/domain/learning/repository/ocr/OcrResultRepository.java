package com.devpath.domain.learning.repository.ocr;

import com.devpath.domain.learning.entity.ocr.OcrResult;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OcrResultRepository extends JpaRepository<OcrResult, Long> {

    Optional<OcrResult> findByIdAndUserId(Long ocrId, Long userId);

    List<OcrResult> findAllByUserIdAndLessonLessonIdOrderByFrameTimestampSecondAsc(Long userId, Long lessonId);

    List<OcrResult> findAllByUserIdAndLessonLessonIdAndSearchableNormalizedTextContainingOrderByFrameTimestampSecondAsc(
            Long userId,
            Long lessonId,
            String keyword
    );

    long countByUserId(Long userId);

    long countByUserIdAndLessonLessonId(Long userId, Long lessonId);
}
