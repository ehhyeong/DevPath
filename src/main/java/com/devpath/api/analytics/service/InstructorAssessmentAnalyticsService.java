package com.devpath.api.analytics.service;

import com.devpath.api.analytics.dto.InstructorAnalyticsAssignmentResponse;
import com.devpath.api.analytics.dto.InstructorAnalyticsDifficultyResponse;
import com.devpath.api.analytics.dto.InstructorAnalyticsQuizResponse;
import com.devpath.api.analytics.dto.InstructorAnalyticsWeakPointResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.course.entity.Course;
import com.devpath.domain.course.entity.CourseNodeMapping;
import com.devpath.domain.course.repository.CourseNodeMappingRepository;
import com.devpath.domain.course.repository.CourseRepository;
import com.devpath.domain.learning.entity.LessonProgress;
import com.devpath.domain.learning.entity.Quiz;
import com.devpath.domain.learning.entity.QuizAttempt;
import com.devpath.domain.learning.entity.Submission;
import com.devpath.domain.learning.entity.SubmissionStatus;
import com.devpath.domain.learning.repository.LessonProgressRepository;
import com.devpath.domain.learning.repository.QuizAttemptRepository;
import com.devpath.domain.learning.repository.QuizRepository;
import com.devpath.domain.learning.repository.SubmissionRepository;
import com.devpath.domain.user.repository.UserRepository;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class InstructorAssessmentAnalyticsService {

  private final UserRepository userRepository;
  private final CourseRepository courseRepository;
  private final CourseNodeMappingRepository courseNodeMappingRepository;
  private final LessonProgressRepository lessonProgressRepository;
  private final SubmissionRepository submissionRepository;
  private final QuizRepository quizRepository;
  private final QuizAttemptRepository quizAttemptRepository;
  private final InstructorAnalyticsMetrics metrics;

  public InstructorAnalyticsAssignmentResponse.Detail getAssignmentStats(Long instructorId) {
    validateInstructor(instructorId);

    Set<Long> nodeIds = loadNodeIds(instructorId);
    if (nodeIds.isEmpty()) {
      return emptyAssignmentDetail();
    }

    List<Submission> submissions =
        submissionRepository
            .findAllByAssignmentRoadmapNodeNodeIdInAndIsDeletedFalseOrderBySubmittedAtDesc(nodeIds);

    long gradedCount =
        submissions.stream()
            .filter(submission -> SubmissionStatus.GRADED.equals(submission.getSubmissionStatus()))
            .count();

    double averageScore =
        averageInteger(
            submissions.stream()
                .map(Submission::getTotalScore)
                .filter(score -> score != null)
                .toList());

    long passedCount =
        submissions.stream()
            .filter(submission -> SubmissionStatus.GRADED.equals(submission.getSubmissionStatus()))
            .filter(
                submission -> submission.getTotalScore() != null && submission.getTotalScore() > 0)
            .count();

    Map<Long, List<Submission>> submissionMap =
        submissions.stream()
            .collect(
                Collectors.groupingBy(
                    submission -> submission.getAssignment().getRoadmapNode().getNodeId()));

    List<InstructorAnalyticsAssignmentResponse.NodeAssignmentItem> items =
        submissionMap.entrySet().stream()
            .map(
                entry -> {
                  List<Submission> nodeSubmissions = entry.getValue();

                  return InstructorAnalyticsAssignmentResponse.NodeAssignmentItem.builder()
                      .nodeId(entry.getKey())
                      .nodeTitle(nodeSubmissions.get(0).getAssignment().getRoadmapNode().getTitle())
                      .submissionCount((long) nodeSubmissions.size())
                      .gradedCount(
                          (long)
                              nodeSubmissions.stream()
                                  .filter(
                                      submission ->
                                          SubmissionStatus.GRADED.equals(
                                              submission.getSubmissionStatus()))
                                  .count())
                      .averageScore(
                          averageInteger(
                              nodeSubmissions.stream()
                                  .map(Submission::getTotalScore)
                                  .filter(score -> score != null)
                                  .toList()))
                      .build();
                })
            .sorted(
                Comparator.comparing(
                        InstructorAnalyticsAssignmentResponse.NodeAssignmentItem
                            ::getSubmissionCount)
                    .reversed())
            .toList();

    return InstructorAnalyticsAssignmentResponse.Detail.builder()
        .summary(
            InstructorAnalyticsAssignmentResponse.Summary.builder()
                .totalSubmissions((long) submissions.size())
                .gradedSubmissions(gradedCount)
                .averageScore(averageScore)
                .passRate(toPercent(passedCount, submissions.size()))
                .build())
        .items(items)
        .build();
  }

  public InstructorAnalyticsQuizResponse.Detail getQuizStats(Long instructorId) {
    validateInstructor(instructorId);

    Set<Long> nodeIds = loadNodeIds(instructorId);
    if (nodeIds.isEmpty()) {
      return emptyQuizDetail();
    }

    List<QuizAttempt> attempts =
        quizAttemptRepository.findAllByQuizRoadmapNodeNodeIdInAndIsDeletedFalseOrderByCreatedAtDesc(
            nodeIds);

    long passedAttempts =
        attempts.stream().filter(attempt -> Boolean.TRUE.equals(attempt.getIsPassed())).count();

    double averageScoreRate = averageDouble(attempts.stream().map(this::toScoreRate).toList());
    int averageTimeSpentSeconds =
        (int)
            Math.round(
                averageInteger(
                    attempts.stream()
                        .map(QuizAttempt::getTimeSpentSeconds)
                        .filter(value -> value != null)
                        .toList()));

    return InstructorAnalyticsQuizResponse.Detail.builder()
        .summary(
            InstructorAnalyticsQuizResponse.Summary.builder()
                .totalAttempts((long) attempts.size())
                .passedAttempts(passedAttempts)
                .averageScoreRate(averageScoreRate)
                .averageTimeSpentSeconds(averageTimeSpentSeconds)
                .build())
        .items(getQuestionPerformance(instructorId))
        .build();
  }

  public List<InstructorAnalyticsDifficultyResponse.NodeItem> getDifficulty(Long instructorId) {
    validateInstructor(instructorId);
    return buildNodeDifficultyItems(instructorId);
  }

  public List<InstructorAnalyticsQuizResponse.QuestionPerformanceItem> getQuestionPerformance(
      Long instructorId) {
    validateInstructor(instructorId);

    Set<Long> nodeIds = loadNodeIds(instructorId);
    if (nodeIds.isEmpty()) {
      return List.of();
    }

    List<Quiz> quizzes =
        quizRepository.findAllByRoadmapNodeNodeIdInAndIsDeletedFalseOrderByCreatedAtDesc(nodeIds);
    List<QuizAttempt> attempts =
        quizAttemptRepository.findAllByQuizRoadmapNodeNodeIdInAndIsDeletedFalseOrderByCreatedAtDesc(
            nodeIds);

    Map<Long, List<QuizAttempt>> attemptMap =
        attempts.stream().collect(Collectors.groupingBy(attempt -> attempt.getQuiz().getId()));

    return quizzes.stream()
        .map(
            quiz -> {
              List<QuizAttempt> quizAttempts = attemptMap.getOrDefault(quiz.getId(), List.of());
              long passedCount =
                  quizAttempts.stream()
                      .filter(attempt -> Boolean.TRUE.equals(attempt.getIsPassed()))
                      .count();

              return InstructorAnalyticsQuizResponse.QuestionPerformanceItem.builder()
                  .quizId(quiz.getId())
                  .quizTitle(quiz.getTitle())
                  .nodeTitle(quiz.getRoadmapNode().getTitle())
                  .questionCount(quiz.getQuestions() == null ? 0 : quiz.getQuestions().size())
                  .attemptCount((long) quizAttempts.size())
                  .passRate(toPercent(passedCount, quizAttempts.size()))
                  .averageScoreRate(
                      averageDouble(quizAttempts.stream().map(this::toScoreRate).toList()))
                  .build();
            })
        .sorted(
            Comparator.comparing(
                    InstructorAnalyticsQuizResponse.QuestionPerformanceItem::getAttemptCount)
                .reversed())
        .toList();
  }

  public List<InstructorAnalyticsWeakPointResponse.NodeItem> getWeakPoints(Long instructorId) {
    validateInstructor(instructorId);

    return buildNodeDifficultyItems(instructorId).stream()
        .map(
            item ->
                InstructorAnalyticsWeakPointResponse.NodeItem.builder()
                    .nodeId(item.getNodeId())
                    .nodeTitle(item.getNodeTitle())
                    .weaknessScore(item.getDifficultyScore())
                    .summary(buildWeakPointSummary(item))
                    .build())
        .sorted(
            Comparator.comparing(InstructorAnalyticsWeakPointResponse.NodeItem::getWeaknessScore)
                .reversed())
        .toList();
  }

  private void validateInstructor(Long instructorId) {
    if (instructorId == null) {
      throw new CustomException(ErrorCode.UNAUTHORIZED);
    }

    userRepository
        .findById(instructorId)
        .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
  }

  private List<Course> loadCourses(Long instructorId) {
    return courseRepository.findAllByInstructorIdOrderByCourseIdDesc(instructorId);
  }

  private Set<Long> loadNodeIds(Long instructorId) {
    List<Long> courseIds = loadCourses(instructorId).stream().map(Course::getCourseId).toList();
    if (courseIds.isEmpty()) {
      return Set.of();
    }

    return courseNodeMappingRepository.findAllByCourseCourseIdIn(courseIds).stream()
        .map(mapping -> mapping.getNode().getNodeId())
        .collect(Collectors.toCollection(LinkedHashSet::new));
  }

  private List<CourseNodeMapping> loadCourseNodeMappings(Long instructorId) {
    List<Long> courseIds = loadCourses(instructorId).stream().map(Course::getCourseId).toList();
    if (courseIds.isEmpty()) {
      return List.of();
    }

    return courseNodeMappingRepository.findAllByCourseCourseIdIn(courseIds);
  }

  private double toScoreRate(QuizAttempt attempt) {
    return metrics.quizScoreRate(attempt, 2);
  }

  private List<InstructorAnalyticsDifficultyResponse.NodeItem> buildNodeDifficultyItems(
      Long instructorId) {
    List<CourseNodeMapping> mappings = loadCourseNodeMappings(instructorId);
    if (mappings.isEmpty()) {
      return List.of();
    }

    Map<Long, String> nodeTitleMap = new LinkedHashMap<>();
    Map<Long, Set<Long>> courseIdsByNodeId = new LinkedHashMap<>();

    for (CourseNodeMapping mapping : mappings) {
      Long nodeId = mapping.getNode().getNodeId();
      nodeTitleMap.putIfAbsent(nodeId, mapping.getNode().getTitle());
      courseIdsByNodeId
          .computeIfAbsent(nodeId, key -> new LinkedHashSet<>())
          .add(mapping.getCourse().getCourseId());
    }

    Set<Long> nodeIds = nodeTitleMap.keySet();
    List<Submission> submissions =
        submissionRepository
            .findAllByAssignmentRoadmapNodeNodeIdInAndIsDeletedFalseOrderBySubmittedAtDesc(nodeIds);
    List<QuizAttempt> attempts =
        quizAttemptRepository.findAllByQuizRoadmapNodeNodeIdInAndIsDeletedFalseOrderByCreatedAtDesc(
            nodeIds);
    List<LessonProgress> lessonProgresses =
        lessonProgressRepository.findAllByInstructorId(instructorId);

    Map<Long, List<Submission>> submissionMap =
        submissions.stream()
            .collect(
                Collectors.groupingBy(
                    submission -> submission.getAssignment().getRoadmapNode().getNodeId()));
    Map<Long, List<QuizAttempt>> attemptMap =
        attempts.stream()
            .collect(
                Collectors.groupingBy(attempt -> attempt.getQuiz().getRoadmapNode().getNodeId()));

    Map<Long, List<LessonProgress>> progressByNodeId = new LinkedHashMap<>();
    Map<Long, Set<Long>> nodeIdsByCourseId = new LinkedHashMap<>();

    for (Map.Entry<Long, Set<Long>> entry : courseIdsByNodeId.entrySet()) {
      for (Long courseId : entry.getValue()) {
        nodeIdsByCourseId
            .computeIfAbsent(courseId, key -> new LinkedHashSet<>())
            .add(entry.getKey());
      }
    }

    for (LessonProgress lessonProgress : lessonProgresses) {
      Long courseId = lessonProgress.getLesson().getSection().getCourse().getCourseId();
      for (Long nodeId : nodeIdsByCourseId.getOrDefault(courseId, Set.of())) {
        progressByNodeId.computeIfAbsent(nodeId, key -> new ArrayList<>()).add(lessonProgress);
      }
    }

    return nodeIds.stream()
        .map(
            nodeId -> {
              List<Submission> nodeSubmissions = submissionMap.getOrDefault(nodeId, List.of());
              List<QuizAttempt> nodeAttempts = attemptMap.getOrDefault(nodeId, List.of());
              List<LessonProgress> nodeProgresses =
                  progressByNodeId.getOrDefault(nodeId, List.of());

              long passedAttempts =
                  nodeAttempts.stream()
                      .filter(attempt -> Boolean.TRUE.equals(attempt.getIsPassed()))
                      .count();

              double quizPassRate = toPercent(passedAttempts, nodeAttempts.size());
              double assignmentScoreRate =
                  averageDouble(nodeSubmissions.stream().map(this::toAssignmentScoreRate).toList());
              long startedCount = nodeProgresses.size();
              long completedCount =
                  nodeProgresses.stream()
                      .filter(progress -> Boolean.TRUE.equals(progress.getIsCompleted()))
                      .count();

              double dropOffRate =
                  startedCount == 0 ? 0.0 : toPercent(startedCount - completedCount, startedCount);
              double difficultyScore =
                  round(
                      ((100.0 - quizPassRate) * 0.4)
                          + ((100.0 - assignmentScoreRate) * 0.35)
                          + (dropOffRate * 0.25));

              return InstructorAnalyticsDifficultyResponse.NodeItem.builder()
                  .nodeId(nodeId)
                  .nodeTitle(nodeTitleMap.get(nodeId))
                  .difficultyScore(difficultyScore)
                  .difficultyLabel(resolveDifficultyLabel(difficultyScore))
                  .quizPassRate(round(quizPassRate))
                  .assignmentScoreRate(round(assignmentScoreRate))
                  .dropOffRate(round(dropOffRate))
                  .build();
            })
        .sorted(
            Comparator.comparing(InstructorAnalyticsDifficultyResponse.NodeItem::getDifficultyScore)
                .reversed())
        .toList();
  }

  private double toAssignmentScoreRate(Submission submission) {
    return metrics.assignmentScoreRate(submission, 2);
  }

  private String buildWeakPointSummary(InstructorAnalyticsDifficultyResponse.NodeItem item) {
    return "Quiz pass rate "
        + round(item.getQuizPassRate())
        + "%, assignment score rate "
        + round(item.getAssignmentScoreRate())
        + "%, and drop-off rate "
        + round(item.getDropOffRate())
        + "% indicate concentrated weakness here.";
  }

  private InstructorAnalyticsAssignmentResponse.Detail emptyAssignmentDetail() {
    return InstructorAnalyticsAssignmentResponse.Detail.builder()
        .summary(
            InstructorAnalyticsAssignmentResponse.Summary.builder()
                .totalSubmissions(0L)
                .gradedSubmissions(0L)
                .averageScore(0.0)
                .passRate(0.0)
                .build())
        .items(List.of())
        .build();
  }

  private InstructorAnalyticsQuizResponse.Detail emptyQuizDetail() {
    return InstructorAnalyticsQuizResponse.Detail.builder()
        .summary(
            InstructorAnalyticsQuizResponse.Summary.builder()
                .totalAttempts(0L)
                .passedAttempts(0L)
                .averageScoreRate(0.0)
                .averageTimeSpentSeconds(0)
                .build())
        .items(List.of())
        .build();
  }

  private double averageInteger(Collection<Integer> values) {
    return metrics.averageIntegers(values, 2);
  }

  private double averageDouble(Collection<Double> values) {
    return metrics.averageDoubles(values, 2);
  }

  private double toPercent(long numerator, long denominator) {
    return metrics.percent(numerator, denominator, 2);
  }

  private String resolveDifficultyLabel(double difficultyScore) {
    if (difficultyScore >= 70.0) {
      return "HARD";
    }
    if (difficultyScore >= 40.0) {
      return "MEDIUM";
    }
    return "EASY";
  }

  private double round(double value) {
    return metrics.round(value, 2);
  }
}
