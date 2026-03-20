package com.devpath.domain.learning.repository;

import com.devpath.domain.learning.entity.TimestampNote;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TimestampNoteRepository extends JpaRepository<TimestampNote, Long> {

    // 특정 학습자의 특정 레슨 노트 목록을 타임스탬프 순으로 조회한다.
    List<TimestampNote> findByUserIdAndLessonLessonIdAndIsDeletedFalseOrderByTimestampSecondAsc(
            Long userId, Long lessonId);

    // 노트 ID와 학습자 ID로 단건 조회한다. (수정/삭제 시 소유권 확인용)
    Optional<TimestampNote> findByIdAndUserIdAndIsDeletedFalse(Long noteId, Long userId);
}
