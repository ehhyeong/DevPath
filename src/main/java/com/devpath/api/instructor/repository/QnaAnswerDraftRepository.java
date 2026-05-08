package com.devpath.api.instructor.repository;

import com.devpath.api.instructor.entity.QnaAnswerDraft;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QnaAnswerDraftRepository extends JpaRepository<QnaAnswerDraft, Long> {

  Optional<QnaAnswerDraft> findByQuestionIdAndInstructorIdAndIsDeletedFalse(
      Long questionId, Long instructorId);
}
