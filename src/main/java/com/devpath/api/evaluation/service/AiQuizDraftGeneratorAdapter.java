package com.devpath.api.evaluation.service;

import com.devpath.api.evaluation.dto.request.CreateAiQuizDraftRequest;
import com.devpath.api.evaluation.dto.response.AiQuizDraftResponse;
import com.devpath.domain.learning.service.QuizDraftGenerator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
class AiQuizDraftGeneratorAdapter implements QuizDraftGenerator {

  private final AiQuizDraftService aiQuizDraftService;

  @Override
  public Draft generate(Long userId, Command command) {
    AiQuizDraftResponse response =
        aiQuizDraftService.createDraft(
            userId,
            CreateAiQuizDraftRequest.builder()
                .nodeId(command.nodeId())
                .title(command.title())
                .description(command.description())
                .quizType(command.quizType())
                .sourceText(command.sourceText())
                .sourceTimestamp(command.sourceTimestamp())
                .sourceMimeType(command.sourceMimeType())
                .sourceBase64Content(command.sourceBase64Content())
                .fallbackOnly(command.fallbackOnly())
                .questionCount(command.questionCount())
                .difficultyLevel(command.difficultyLevel())
                .build());

    return new Draft(
        response.getTitle(),
        response.getDescription(),
        response.getQuizType(),
        response.getQuestions().stream()
            .map(
                question ->
                    new Question(
                        question.getQuestionType(),
                        question.getQuestionText(),
                        question.getExplanation(),
                        question.getPoints(),
                        question.getDisplayOrder(),
                        question.getSourceTimestamp(),
                        question.getOptions().stream()
                            .map(
                                option ->
                                    new Option(
                                        option.getOptionText(),
                                        option.getCorrect(),
                                        option.getDisplayOrder()))
                            .toList()))
            .toList());
  }
}
