package com.devpath.domain.learning.repository.ocr;

import com.devpath.domain.learning.entity.ocr.OcrResult;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

// Repository methods mirror the read paths exposed by the learning OCR APIs.
public interface OcrResultRepository extends JpaRepository<OcrResult, Long> {

    Optional<OcrResult> findByIdAndUserId(Long ocrId, Long userId);

    List<OcrResult> findAllByUserIdAndLessonLessonIdOrderByFrameTimestampSecondAsc(Long userId, Long lessonId);

    List<OcrResult> findAllByUserIdAndLessonLessonIdAndSearchableNormalizedTextContainingOrderByFrameTimestampSecondAsc(
            Long userId,
            Long lessonId,
            String keyword
    );
}
