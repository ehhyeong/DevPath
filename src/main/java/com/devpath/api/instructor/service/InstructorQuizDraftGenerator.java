package com.devpath.api.instructor.service;

import com.devpath.api.instructor.dto.InstructorLessonEvaluationDto;
import com.devpath.domain.course.entity.Lesson;
import com.devpath.domain.learning.entity.Quiz;
import com.devpath.domain.learning.entity.QuizType;
import com.devpath.domain.learning.repository.QuizRepository;
import com.devpath.domain.learning.service.QuizDraftGenerator;
import com.devpath.domain.roadmap.entity.RoadmapNode;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

@Component
class InstructorQuizDraftGenerator {

  private final QuizRepository quizRepository;
  private final QuizDraftGenerator quizDraftGenerator;

  InstructorQuizDraftGenerator(
      QuizRepository quizRepository, QuizDraftGenerator quizDraftGenerator) {
    this.quizRepository = quizRepository;
    this.quizDraftGenerator = quizDraftGenerator;
  }

  InstructorLessonEvaluationDto.QuizEditorResponse generate(
      Long instructorId,
      Lesson lesson,
      RoadmapNode node,
      InstructorLessonEvaluationDto.GenerateQuizRequest request) {
    Quiz existingQuiz =
        quizRepository
            .findFirstByRoadmapNodeNodeIdAndIsDeletedFalseOrderByCreatedAtDesc(node.getNodeId())
            .orElse(null);

    QuizDraftGenerator.Draft draft =
        quizDraftGenerator.generate(
            instructorId,
            new QuizDraftGenerator.Command(
                node.getNodeId(),
                existingQuiz == null
                    ? defaultIfBlank(lesson.getTitle(), "새 퀴즈")
                    : existingQuiz.getTitle(),
                existingQuiz == null
                    ? normalizeText(lesson.getDescription())
                    : existingQuiz.getDescription(),
                resolveGeneratedQuizType(request.getMode()),
                buildQuizSourceText(lesson, request),
                normalizeText(request.getVideoFileName()),
                normalizeText(request.getVideoMimeType()),
                normalizeText(request.getVideoBase64Content()),
                !hasGenerationInput(request),
                clampQuestionCount(request.getQuestionCount()),
                clampDifficultyLevel(request.getDifficultyLevel())));

    return buildQuizDraftResponse(lesson, node, existingQuiz, draft);
  }

  private InstructorLessonEvaluationDto.QuizEditorResponse buildQuizDraftResponse(
      Lesson lesson, RoadmapNode node, Quiz existingQuiz, QuizDraftGenerator.Draft draft) {
    return InstructorLessonEvaluationDto.QuizEditorResponse.builder()
        .lessonId(lesson.getLessonId())
        .nodeId(node.getNodeId())
        .quizId(existingQuiz == null ? null : existingQuiz.getId())
        .title(draft.title())
        .description(draft.description())
        .quizType(draft.quizType() == null ? QuizType.MANUAL.name() : draft.quizType().name())
        .totalScore(
            draft.questions().stream()
                .mapToInt(question -> question.points() == null ? 0 : question.points())
                .sum())
        .passScore(existingQuiz == null ? 60 : defaultNumber(existingQuiz.getPassScore(), 60))
        .timeLimitMinutes(
            existingQuiz == null ? 10 : defaultNumber(existingQuiz.getTimeLimitMinutes(), 10))
        .exposeAnswer(existingQuiz != null && Boolean.TRUE.equals(existingQuiz.getExposeAnswer()))
        .exposeExplanation(
            existingQuiz != null && Boolean.TRUE.equals(existingQuiz.getExposeExplanation()))
        .isPublished(existingQuiz != null && Boolean.TRUE.equals(existingQuiz.getIsPublished()))
        .questions(
            draft.questions().stream()
                .map(
                    question ->
                        InstructorLessonEvaluationDto.QuizQuestionItem.builder()
                            .questionId(null)
                            .questionType(question.questionType().name())
                            .questionText(question.questionText())
                            .explanation(question.explanation())
                            .points(question.points())
                            .displayOrder(question.displayOrder())
                            .sourceTimestamp(question.sourceTimestamp())
                            .options(
                                question.options().stream()
                                    .map(
                                        option ->
                                            InstructorLessonEvaluationDto.QuizOptionItem.builder()
                                                .optionId(null)
                                                .optionText(option.optionText())
                                                .isCorrect(option.correct())
                                                .displayOrder(option.displayOrder())
                                                .build())
                                    .toList())
                            .build())
                .toList())
        .build();
  }

  private QuizType resolveGeneratedQuizType(String mode) {
    return "video".equalsIgnoreCase(mode) ? QuizType.AI_VIDEO : QuizType.AI_TOPIC;
  }

  private String buildQuizSourceText(
      Lesson lesson, InstructorLessonEvaluationDto.GenerateQuizRequest request) {
    List<String> parts = new ArrayList<>();

    if (request.getKeywords() != null && !request.getKeywords().isEmpty()) {
      String keywordText =
          request.getKeywords().stream()
              .filter(value -> !isBlank(value))
              .collect(Collectors.joining(", "));
      if (!isBlank(keywordText)) {
        parts.add("키워드: " + keywordText);
      }
    }

    if (!isBlank(request.getScriptText())) {
      parts.add(request.getScriptText().trim());
    }

    if (!isBlank(request.getVideoFileName())) {
      parts.add("비디오 파일: " + request.getVideoFileName().trim());
    }

    if (!isBlank(lesson.getTitle())) {
      parts.add("레슨 제목: " + lesson.getTitle().trim());
    }

    if (!isBlank(lesson.getDescription())) {
      parts.add("레슨 설명: " + lesson.getDescription().trim());
    }

    return parts.isEmpty() ? "기본 학습 내용을 바탕으로 퀴즈를 생성합니다." : String.join("\n", parts);
  }

  private boolean hasGenerationInput(InstructorLessonEvaluationDto.GenerateQuizRequest request) {
    if ("video".equalsIgnoreCase(request.getMode())) {
      return !isBlank(request.getVideoBase64Content()) || !isBlank(request.getVideoFileName());
    }

    boolean hasKeyword =
        request.getKeywords() != null
            && request.getKeywords().stream().anyMatch(value -> !isBlank(value));
    return hasKeyword || !isBlank(request.getScriptText());
  }

  private int clampQuestionCount(Integer questionCount) {
    if (questionCount == null) {
      return 3;
    }
    return Math.max(1, Math.min(questionCount, 10));
  }

  private int clampDifficultyLevel(Integer difficultyLevel) {
    if (difficultyLevel == null) {
      return 2;
    }
    return Math.max(1, Math.min(difficultyLevel, 3));
  }

  private String defaultIfBlank(String value, String fallback) {
    return isBlank(value) ? fallback : value.trim();
  }

  private String normalizeText(String value) {
    return isBlank(value) ? null : value.trim();
  }

  private Integer defaultNumber(Integer value, int fallback) {
    return value == null ? fallback : Math.max(value, 0);
  }

  private boolean isBlank(String value) {
    return value == null || value.isBlank();
  }
}
