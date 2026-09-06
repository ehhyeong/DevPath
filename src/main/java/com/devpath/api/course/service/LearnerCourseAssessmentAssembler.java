package com.devpath.api.course.service;

import com.devpath.api.course.dto.CourseDetailResponse;
import com.devpath.domain.course.entity.Lesson;
import com.devpath.domain.learning.entity.Assignment;
import com.devpath.domain.learning.entity.Quiz;
import com.devpath.domain.learning.entity.QuizQuestion;
import com.devpath.domain.learning.entity.QuizQuestionOption;
import com.devpath.domain.learning.entity.Rubric;
import com.devpath.domain.learning.entity.SubmissionType;
import com.devpath.domain.learning.repository.AssignmentRepository;
import com.devpath.domain.learning.repository.QuizRepository;
import com.devpath.domain.roadmap.entity.RoadmapNode;
import java.util.Arrays;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class LearnerCourseAssessmentAssembler {

  private final AssignmentRepository assignmentRepository;
  private final QuizRepository quizRepository;

  AssessmentMapping loadAssessments(List<Lesson> lessons) {
    return new AssessmentMapping(loadAssignmentMapping(lessons), loadQuizMapping(lessons));
  }

  CourseDetailResponse.AssignmentItem mapAssignmentForLesson(
      Lesson lesson, AssessmentMapping mapping) {
    return mapAssignment(resolveAssignmentForLesson(lesson, mapping.assignmentsByNodeId()));
  }

  CourseDetailResponse.QuizItem mapQuizForLesson(Lesson lesson, AssessmentMapping mapping) {
    return mapQuiz(resolveQuizForLesson(lesson, mapping.quizzesByNodeId()));
  }

  private Map<Long, Quiz> loadQuizMapping(List<Lesson> lessons) {
    List<Long> quizNodeIds =
        lessons.stream()
            .map(Lesson::getQuizRoadmapNode)
            .filter(Objects::nonNull)
            .map(RoadmapNode::getNodeId)
            .distinct()
            .toList();
    if (quizNodeIds.isEmpty()) {
      return Map.of();
    }

    Map<Long, Quiz> quizzesByNodeId = new LinkedHashMap<>();
    quizRepository
        .findAllByRoadmapNodeNodeIdInAndIsDeletedFalseOrderByCreatedAtDesc(quizNodeIds)
        .forEach(
            quiz -> {
              if (!Boolean.TRUE.equals(quiz.getIsPublished())
                  || !Boolean.TRUE.equals(quiz.getIsActive())) {
                return;
              }

              quizzesByNodeId.putIfAbsent(quiz.getRoadmapNode().getNodeId(), quiz);
            });
    return quizzesByNodeId;
  }

  private Quiz resolveQuizForLesson(Lesson lesson, Map<Long, Quiz> quizzesByNodeId) {
    if (lesson.getQuizRoadmapNode() == null) {
      return null;
    }

    return quizzesByNodeId.get(lesson.getQuizRoadmapNode().getNodeId());
  }

  private CourseDetailResponse.QuizItem mapQuiz(Quiz quiz) {
    if (quiz == null) {
      return null;
    }

    boolean exposeAnswer = Boolean.TRUE.equals(quiz.getExposeAnswer());
    boolean exposeExplanation = Boolean.TRUE.equals(quiz.getExposeExplanation());
    List<CourseDetailResponse.QuizQuestionItem> questions =
        quiz.getQuestions().stream()
            .filter(question -> !Boolean.TRUE.equals(question.getIsDeleted()))
            .sorted(
                Comparator.comparing(
                    QuizQuestion::getDisplayOrder, Comparator.nullsLast(Comparator.naturalOrder())))
            .map(question -> mapQuizQuestion(question, exposeAnswer, exposeExplanation))
            .toList();

    return CourseDetailResponse.QuizItem.builder()
        .quizId(quiz.getId())
        .roadmapNodeId(quiz.getRoadmapNode().getNodeId())
        .title(quiz.getTitle())
        .description(quiz.getDescription())
        .passScore(quiz.getPassScore())
        .exposeAnswer(exposeAnswer)
        .exposeExplanation(exposeExplanation)
        .questions(questions)
        .build();
  }

  private CourseDetailResponse.QuizQuestionItem mapQuizQuestion(
      QuizQuestion question, boolean exposeAnswer, boolean exposeExplanation) {
    List<QuizQuestionOption> options =
        question.getOptions().stream()
            .filter(option -> !Boolean.TRUE.equals(option.getIsDeleted()))
            .sorted(
                Comparator.comparing(
                    QuizQuestionOption::getDisplayOrder,
                    Comparator.nullsLast(Comparator.naturalOrder())))
            .toList();
    Long correctOptionId =
        exposeAnswer
            ? options.stream()
                .filter(option -> Boolean.TRUE.equals(option.getIsCorrect()))
                .map(QuizQuestionOption::getId)
                .findFirst()
                .orElse(null)
            : null;

    return CourseDetailResponse.QuizQuestionItem.builder()
        .questionId(question.getId())
        .questionType(question.getQuestionType() == null ? null : question.getQuestionType().name())
        .questionText(question.getQuestionText())
        .explanation(exposeExplanation ? question.getExplanation() : null)
        .points(question.getPoints())
        .displayOrder(question.getDisplayOrder())
        .options(
            options.stream()
                .map(
                    option ->
                        CourseDetailResponse.QuizOptionItem.builder()
                            .optionId(option.getId())
                            .optionText(option.getOptionText())
                            .displayOrder(option.getDisplayOrder())
                            .build())
                .toList())
        .correctOptionId(correctOptionId)
        .build();
  }

  private Map<Long, Assignment> loadAssignmentMapping(List<Lesson> lessons) {
    List<Long> assignmentNodeIds =
        lessons.stream()
            .map(Lesson::getAssignmentRoadmapNode)
            .filter(Objects::nonNull)
            .map(RoadmapNode::getNodeId)
            .distinct()
            .toList();
    if (assignmentNodeIds.isEmpty()) {
      return Map.of();
    }

    Map<Long, Assignment> assignmentsByNodeId = new LinkedHashMap<>();
    assignmentRepository
        .findAllByRoadmapNodeNodeIdInAndIsDeletedFalseOrderByCreatedAtDesc(assignmentNodeIds)
        .forEach(
            assignment -> {
              if (!Boolean.TRUE.equals(assignment.getIsPublished())
                  || !Boolean.TRUE.equals(assignment.getIsActive())) {
                return;
              }

              assignmentsByNodeId.putIfAbsent(assignment.getRoadmapNode().getNodeId(), assignment);
            });
    return assignmentsByNodeId;
  }

  private Assignment resolveAssignmentForLesson(
      Lesson lesson, Map<Long, Assignment> assignmentsByNodeId) {
    if (lesson.getAssignmentRoadmapNode() == null) {
      return null;
    }

    return assignmentsByNodeId.get(lesson.getAssignmentRoadmapNode().getNodeId());
  }

  private CourseDetailResponse.AssignmentItem mapAssignment(Assignment assignment) {
    if (assignment == null) {
      return null;
    }

    List<String> allowedFileFormats =
        assignment.getAllowedFileFormats() == null
            ? List.of()
            : Arrays.stream(assignment.getAllowedFileFormats().split(","))
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .toList();
    List<CourseDetailResponse.AssignmentRubricItem> rubrics =
        assignment.getRubrics().stream()
            .filter(rubric -> !Boolean.TRUE.equals(rubric.getIsDeleted()))
            .sorted(
                Comparator.comparing(
                    Rubric::getDisplayOrder, Comparator.nullsLast(Comparator.naturalOrder())))
            .map(
                rubric ->
                    CourseDetailResponse.AssignmentRubricItem.builder()
                        .rubricId(rubric.getId())
                        .criteriaName(rubric.getCriteriaName())
                        .criteriaDescription(rubric.getCriteriaDescription())
                        .maxPoints(rubric.getMaxPoints())
                        .displayOrder(rubric.getDisplayOrder())
                        .build())
            .toList();
    AssignmentSubmissionFlags submissionFlags = resolveAssignmentSubmissionFlags(assignment);

    return CourseDetailResponse.AssignmentItem.builder()
        .assignmentId(assignment.getId())
        .roadmapNodeId(assignment.getRoadmapNode().getNodeId())
        .title(assignment.getTitle())
        .description(assignment.getDescription())
        .submissionRuleDescription(assignment.getSubmissionRuleDescription())
        .totalScore(assignment.getTotalScore())
        .passScore(assignment.getPassScore())
        .aiReviewEnabled(assignment.getAiReviewEnabled())
        .allowTextSubmission(submissionFlags.allowTextSubmission())
        .allowFileSubmission(submissionFlags.allowFileSubmission())
        .allowUrlSubmission(submissionFlags.allowUrlSubmission())
        .readmeRequired(assignment.getReadmeRequired())
        .testRequired(assignment.getTestRequired())
        .lintRequired(assignment.getLintRequired())
        .allowLateSubmission(assignment.getAllowLateSubmission())
        .dueAt(assignment.getDueAt())
        .allowedFileFormats(allowedFileFormats)
        .rubrics(rubrics)
        .build();
  }

  private AssignmentSubmissionFlags resolveAssignmentSubmissionFlags(Assignment assignment) {
    if (assignment.getAllowTextSubmission() != null
        || assignment.getAllowFileSubmission() != null
        || assignment.getAllowUrlSubmission() != null) {
      return new AssignmentSubmissionFlags(
          Boolean.TRUE.equals(assignment.getAllowTextSubmission()),
          Boolean.TRUE.equals(assignment.getAllowFileSubmission()),
          Boolean.TRUE.equals(assignment.getAllowUrlSubmission()));
    }

    SubmissionType submissionType = assignment.getSubmissionType();
    if (submissionType == null) {
      return new AssignmentSubmissionFlags(true, true, false);
    }

    return switch (submissionType) {
      case FILE -> new AssignmentSubmissionFlags(false, true, false);
      case URL -> new AssignmentSubmissionFlags(false, false, true);
      case TEXT -> new AssignmentSubmissionFlags(true, false, false);
      case MULTIPLE -> new AssignmentSubmissionFlags(true, true, true);
    };
  }

  private record AssignmentSubmissionFlags(
      boolean allowTextSubmission, boolean allowFileSubmission, boolean allowUrlSubmission) {}

  record AssessmentMapping(
      Map<Long, Assignment> assignmentsByNodeId, Map<Long, Quiz> quizzesByNodeId) {}
}
