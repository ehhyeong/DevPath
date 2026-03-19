package com.devpath.domain.learning.repository;

import com.devpath.domain.learning.entity.WrongAnswerNote;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WrongAnswerNoteRepository extends JpaRepository<WrongAnswerNote, Long> {

    // soft delete 되지 않은 오답 노트를 id 기준으로 단건 조회한다.
    Optional<WrongAnswerNote> findByIdAndIsDeletedFalse(Long id);

    // 특정 학습자의 오답 노트 목록을 최신 생성순으로 조회한다.
    List<WrongAnswerNote> findAllByLearnerIdAndIsDeletedFalseOrderByCreatedAtDesc(Long learnerId);
}
