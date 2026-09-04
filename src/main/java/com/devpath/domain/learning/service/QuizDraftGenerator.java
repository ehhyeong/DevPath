package com.devpath.domain.learning.service;

import com.devpath.domain.learning.entity.QuestionType;
import com.devpath.domain.learning.entity.QuizType;
import java.util.List;

public interface QuizDraftGenerator {

  Draft generate(Long userId, Command command);

  record Command(
      Long nodeId,
      String title,
      String description,
      QuizType quizType,
      String sourceText,
      String sourceTimestamp,
      String sourceMimeType,
      String sourceBase64Content,
      boolean fallbackOnly,
      int questionCount,
      int difficultyLevel) {}

  record Draft(String title, String description, QuizType quizType, List<Question> questions) {}

  record Question(
      QuestionType questionType,
      String questionText,
      String explanation,
      Integer points,
      Integer displayOrder,
      String sourceTimestamp,
      List<Option> options) {}

  record Option(String optionText, Boolean correct, Integer displayOrder) {}
}
