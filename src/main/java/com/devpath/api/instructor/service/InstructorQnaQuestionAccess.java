package com.devpath.api.instructor.service;

import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.qna.entity.Question;
import com.devpath.domain.qna.repository.QuestionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
class InstructorQnaQuestionAccess {

  private final QuestionRepository questionRepository;

  Question getManagedQuestion(Long questionId, Long instructorId) {
    return questionRepository
        .findManagedQuestionByInstructorId(questionId, instructorId)
        .orElseGet(
            () -> {
              if (questionRepository.findByIdAndIsDeletedFalse(questionId).isPresent()) {
                throw new CustomException(ErrorCode.UNAUTHORIZED_ACTION);
              }
              throw new CustomException(ErrorCode.QUESTION_NOT_FOUND);
            });
  }
}
