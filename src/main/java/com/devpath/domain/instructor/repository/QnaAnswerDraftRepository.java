package com.devpath.domain.instructor.repository;

import com.devpath.domain.instructor.entity.QnaAnswerDraft;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QnaAnswerDraftRepository extends JpaRepository<QnaAnswerDraft, Long> {

  Optional<QnaAnswerDraft> findByQuestionIdAndInstructorIdAndIsDeletedFalse(
      Long questionId, Long instructorId);
}
