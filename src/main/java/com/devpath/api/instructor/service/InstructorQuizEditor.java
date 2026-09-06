package com.devpath.api.instructor.service;

import com.devpath.api.instructor.dto.InstructorLessonEvaluationDto;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.course.entity.Lesson;
import com.devpath.domain.learning.entity.QuestionType;
import com.devpath.domain.learning.entity.Quiz;
import com.devpath.domain.learning.entity.QuizQuestion;
import com.devpath.domain.learning.entity.QuizQuestionOption;
import com.devpath.domain.learning.entity.QuizType;
import com.devpath.domain.learning.repository.QuizRepository;
import com.devpath.domain.roadmap.entity.RoadmapNode;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

@Component
class InstructorQuizEditor {

  private static final int MAX_QUESTION_EXPLANATION_LENGTH = 120;

  private final QuizRepository quizRepository;

  InstructorQuizEditor(QuizRepository quizRepository) {
    this.quizRepository = quizRepository;
  }

  InstructorLessonEvaluationDto.QuizEditorResponse get(Lesson lesson, RoadmapNode node) {
    Quiz quiz =
        node == null
            ? null
            : quizRepository
                .findFirstByRoadmapNodeNodeIdAndIsDeletedFalseOrderByCreatedAtDesc(node.getNodeId())
                .orElse(null);

    return mapQuizEditor(lesson, node, quiz);
  }

  InstructorLessonEvaluationDto.QuizEditorResponse save(
      Lesson lesson,
      RoadmapNode node,
      InstructorLessonEvaluationDto.SaveQuizEditorRequest request) {
    Quiz quiz =
        quizRepository
            .findFirstByRoadmapNodeNodeIdAndIsDeletedFalseOrderByCreatedAtDesc(node.getNodeId())
            .orElse(null);

    if (quiz == null) {
      quiz =
          Quiz.builder()
              .roadmapNode(node)
              .title(defaultIfBlank(request.getTitle(), lesson.getTitle()))
              .description(normalizeText(request.getDescription()))
              .quizType(resolveQuizType(request.getQuizType(), QuizType.MANUAL))
              .totalScore(0)
              .passScore(request.getPassScore())
              .timeLimitMinutes(request.getTimeLimitMinutes())
              .isPublished(Boolean.TRUE.equals(request.getIsPublished()))
              .isActive(true)
              .exposeAnswer(Boolean.TRUE.equals(request.getExposeAnswer()))
              .exposeExplanation(Boolean.TRUE.equals(request.getExposeExplanation()))
              .build();
    }

    node.updateInfo(
        defaultIfBlank(request.getTitle(), lesson.getTitle()),
        normalizeText(request.getDescription()),
        "COURSE_QUIZ");

    quiz.updateInfo(
        defaultIfBlank(request.getTitle(), lesson.getTitle()),
        normalizeText(request.getDescription()),
        resolveQuizType(request.getQuizType(), quiz.getQuizType()),
        0,
        request.getPassScore(),
        request.getTimeLimitMinutes());
    quiz.updateExposePolicy(
        Boolean.TRUE.equals(request.getExposeAnswer()),
        Boolean.TRUE.equals(request.getExposeExplanation()));

    if (Boolean.TRUE.equals(request.getIsPublished())) {
      quiz.publish();
    } else {
      quiz.unpublish();
    }

    quiz.activate();
    quiz.getQuestions().clear();

    List<InstructorLessonEvaluationDto.QuizQuestionInput> questionInputs =
        request.getQuestions() == null
            ? List.of()
            : request.getQuestions().stream().filter(this::hasQuizQuestionContent).toList();

    int totalScore = 0;
    for (int questionIndex = 0; questionIndex < questionInputs.size(); questionIndex += 1) {
      InstructorLessonEvaluationDto.QuizQuestionInput questionInput =
          questionInputs.get(questionIndex);
      QuestionType questionType = resolveQuestionType(questionInput.getQuestionType());
      List<SanitizedQuizOption> options =
          sanitizeQuizOptions(questionType, questionInput.getOptions());

      QuizQuestion question =
          QuizQuestion.builder()
              .questionType(questionType)
              .questionText(defaultIfBlank(questionInput.getQuestionText(), "문항"))
              .explanation(normalizeExplanation(questionInput.getExplanation()))
              .points(defaultNumber(questionInput.getPoints(), 5))
              .displayOrder(defaultNumber(questionInput.getDisplayOrder(), questionIndex + 1))
              .sourceTimestamp(normalizeText(questionInput.getSourceTimestamp()))
              .build();

      for (int optionIndex = 0; optionIndex < options.size(); optionIndex += 1) {
        SanitizedQuizOption option = options.get(optionIndex);
        question.addOption(
            QuizQuestionOption.builder()
                .optionText(option.optionText())
                .isCorrect(option.correct())
                .displayOrder(defaultNumber(option.displayOrder(), optionIndex + 1))
                .build());
      }

      totalScore += question.getPoints();
      quiz.addQuestion(question);
    }

    quiz.updateInfo(
        defaultIfBlank(request.getTitle(), lesson.getTitle()),
        normalizeText(request.getDescription()),
        resolveQuizType(request.getQuizType(), quiz.getQuizType()),
        totalScore,
        request.getPassScore(),
        request.getTimeLimitMinutes());

    // AI 생성에 사용한 키워드/스크립트를 보존해 재진입 시 복원되도록 한다.
    quiz.updateGenerationSource(
        joinKeywords(request.getKeywords()), normalizeText(request.getScriptText()));

    Quiz savedQuiz = quizRepository.save(quiz);
    return mapQuizEditor(lesson, node, savedQuiz);
  }

  private InstructorLessonEvaluationDto.QuizEditorResponse mapQuizEditor(
      Lesson lesson, RoadmapNode node, Quiz quiz) {
    if (quiz == null) {
      return InstructorLessonEvaluationDto.QuizEditorResponse.builder()
          .lessonId(lesson.getLessonId())
          .nodeId(node == null ? null : node.getNodeId())
          .quizId(null)
          .title(defaultIfBlank(lesson.getTitle(), "새 퀴즈"))
          .description(normalizeText(lesson.getDescription()))
          .quizType(QuizType.MANUAL.name())
          .totalScore(0)
          .passScore(60)
          .timeLimitMinutes(10)
          .exposeAnswer(false)
          .exposeExplanation(false)
          .isPublished(false)
          .keywords(List.of())
          .scriptText(null)
          .questions(List.of())
          .build();
    }

    return InstructorLessonEvaluationDto.QuizEditorResponse.builder()
        .lessonId(lesson.getLessonId())
        .nodeId(quiz.getRoadmapNode().getNodeId())
        .quizId(quiz.getId())
        .title(quiz.getTitle())
        .description(quiz.getDescription())
        .quizType(quiz.getQuizType() == null ? QuizType.MANUAL.name() : quiz.getQuizType().name())
        .totalScore(defaultNumber(quiz.getTotalScore(), 0))
        .passScore(defaultNumber(quiz.getPassScore(), 60))
        .timeLimitMinutes(defaultNumber(quiz.getTimeLimitMinutes(), 10))
        .exposeAnswer(Boolean.TRUE.equals(quiz.getExposeAnswer()))
        .exposeExplanation(Boolean.TRUE.equals(quiz.getExposeExplanation()))
        .isPublished(Boolean.TRUE.equals(quiz.getIsPublished()))
        .keywords(splitKeywords(quiz.getGenerationKeywords()))
        .scriptText(quiz.getGenerationScript())
        .questions(
            quiz.getQuestions().stream()
                .filter(question -> !Boolean.TRUE.equals(question.getIsDeleted()))
                .sorted(Comparator.comparing(QuizQuestion::getDisplayOrder))
                .map(
                    question ->
                        InstructorLessonEvaluationDto.QuizQuestionItem.builder()
                            .questionId(question.getId())
                            .questionType(question.getQuestionType().name())
                            .questionText(question.getQuestionText())
                            .explanation(question.getExplanation())
                            .points(question.getPoints())
                            .displayOrder(question.getDisplayOrder())
                            .sourceTimestamp(question.getSourceTimestamp())
                            .options(
                                question.getOptions().stream()
                                    .filter(option -> !Boolean.TRUE.equals(option.getIsDeleted()))
                                    .sorted(
                                        Comparator.comparing(QuizQuestionOption::getDisplayOrder))
                                    .map(
                                        option ->
                                            InstructorLessonEvaluationDto.QuizOptionItem.builder()
                                                .optionId(option.getId())
                                                .optionText(option.getOptionText())
                                                .isCorrect(option.getIsCorrect())
                                                .displayOrder(option.getDisplayOrder())
                                                .build())
                                    .toList())
                            .build())
                .toList())
        .build();
  }

  private boolean hasQuizQuestionContent(InstructorLessonEvaluationDto.QuizQuestionInput input) {
    if (input == null) {
      return false;
    }

    if (!isBlank(input.getQuestionText())) {
      return true;
    }

    return input.getOptions() != null
        && input.getOptions().stream()
            .anyMatch(option -> option != null && !isBlank(option.getOptionText()));
  }

  private List<SanitizedQuizOption> sanitizeQuizOptions(
      QuestionType questionType, List<InstructorLessonEvaluationDto.QuizOptionInput> inputs) {
    List<SanitizedQuizOption> options =
        inputs == null
            ? new ArrayList<>()
            : inputs.stream()
                .filter(
                    input ->
                        input != null
                            && (!isBlank(input.getOptionText())
                                || questionType == QuestionType.TRUE_FALSE))
                .map(
                    input ->
                        new SanitizedQuizOption(
                            defaultIfBlank(input.getOptionText(), ""),
                            Boolean.TRUE.equals(input.getIsCorrect()),
                            input.getDisplayOrder()))
                .collect(Collectors.toCollection(ArrayList::new));

    if (questionType == QuestionType.TRUE_FALSE) {
      if (options.size() != 2
          || options.stream().filter(SanitizedQuizOption::correct).count() != 1) {
        return List.of(
            new SanitizedQuizOption("O", true, 1), new SanitizedQuizOption("X", false, 2));
      }
      return options;
    }

    if (questionType == QuestionType.SHORT_ANSWER) {
      if (options.isEmpty()) {
        return List.of(new SanitizedQuizOption("", true, 1));
      }
      SanitizedQuizOption first = options.get(0);
      return List.of(new SanitizedQuizOption(first.optionText(), true, 1));
    }

    if (options.size() < 2) {
      throw new CustomException(ErrorCode.INVALID_INPUT, "객관식 문항은 보기 2개 이상이 필요합니다.");
    }

    if (options.stream().noneMatch(SanitizedQuizOption::correct)) {
      throw new CustomException(ErrorCode.INVALID_INPUT, "객관식 문항은 정답 보기가 필요합니다.");
    }

    return options;
  }

  private QuestionType resolveQuestionType(String rawValue) {
    if (isBlank(rawValue)) {
      return QuestionType.MULTIPLE_CHOICE;
    }

    try {
      return QuestionType.valueOf(rawValue.trim().toUpperCase(Locale.ROOT));
    } catch (IllegalArgumentException exception) {
      throw new CustomException(ErrorCode.INVALID_INPUT, "지원하지 않는 문항 유형입니다.");
    }
  }

  private QuizType resolveQuizType(String rawValue, QuizType fallback) {
    if (isBlank(rawValue)) {
      return fallback == null ? QuizType.MANUAL : fallback;
    }

    try {
      return QuizType.valueOf(rawValue.trim().toUpperCase(Locale.ROOT));
    } catch (IllegalArgumentException exception) {
      return fallback == null ? QuizType.MANUAL : fallback;
    }
  }

  // 키워드 목록을 저장용 쉼표 구분 문자열로 합친다.
  private String joinKeywords(List<String> keywords) {
    if (keywords == null || keywords.isEmpty()) {
      return null;
    }

    String joined =
        keywords.stream()
            .map(this::normalizeText)
            .filter(keyword -> !isBlank(keyword))
            .distinct()
            .collect(Collectors.joining(","));

    return joined.isBlank() ? null : joined;
  }

  // 저장된 쉼표 구분 문자열을 키워드 목록으로 분리한다.
  private List<String> splitKeywords(String generationKeywords) {
    if (isBlank(generationKeywords)) {
      return List.of();
    }

    return Arrays.stream(generationKeywords.split(","))
        .map(String::trim)
        .filter(keyword -> !keyword.isBlank())
        .toList();
  }

  private String defaultIfBlank(String value, String fallback) {
    return isBlank(value) ? fallback : value.trim();
  }

  private String normalizeText(String value) {
    return isBlank(value) ? null : value.trim();
  }

  private String normalizeExplanation(String value) {
    if (isBlank(value)) {
      return null;
    }

    String normalized = value.replace("\n", " ").replace("\r", " ").trim();
    return normalized.length() <= MAX_QUESTION_EXPLANATION_LENGTH
        ? normalized
        : normalized.substring(0, MAX_QUESTION_EXPLANATION_LENGTH).trim();
  }

  private Integer defaultNumber(Integer value, int fallback) {
    return value == null ? fallback : Math.max(value, 0);
  }

  private boolean isBlank(String value) {
    return value == null || value.isBlank();
  }

  private record SanitizedQuizOption(String optionText, boolean correct, Integer displayOrder) {}
}
