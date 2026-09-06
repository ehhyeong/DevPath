package com.devpath.api.analytics.service;

import com.devpath.api.analytics.dto.InstructorAnalyticsDifficultyResponse;
import com.devpath.api.analytics.dto.InstructorAnalyticsWeakPointResponse;
import com.devpath.domain.analytics.service.InstructorAnalyticsMetrics;
import com.devpath.domain.course.entity.CourseNodeMapping;
import com.devpath.domain.learning.entity.LessonProgress;
import com.devpath.domain.learning.entity.QuizAttempt;
import com.devpath.domain.learning.entity.Submission;
import com.devpath.domain.learning.repository.LessonProgressRepository;
import com.devpath.domain.learning.repository.QuizAttemptRepository;
import com.devpath.domain.learning.repository.SubmissionRepository;
import java.util.ArrayList;
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
public class InstructorDifficultyAnalyticsService {

  private final LessonProgressRepository lessonProgressRepository;
  private final SubmissionRepository submissionRepository;
  private final QuizAttemptRepository quizAttemptRepository;
  private final InstructorAnalyticsMetrics metrics;
  private final InstructorAnalyticsScope analyticsScope;

  public List<InstructorAnalyticsDifficultyResponse.NodeItem> getDifficulty(Long instructorId) {
    return buildNodeDifficultyItems(instructorId);
  }

  public List<InstructorAnalyticsWeakPointResponse.NodeItem> getWeakPoints(Long instructorId) {
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

  private List<InstructorAnalyticsDifficultyResponse.NodeItem> buildNodeDifficultyItems(
      Long instructorId) {
    List<CourseNodeMapping> mappings = analyticsScope.loadCourseNodeMappings(instructorId);
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
    Map<Long, List<LessonProgress>> progressByNodeId =
        mapProgressesToNodes(courseIdsByNodeId, lessonProgresses);

    return nodeIds.stream()
        .map(
            nodeId ->
                buildDifficultyItem(
                    nodeId,
                    nodeTitleMap.get(nodeId),
                    submissionMap.getOrDefault(nodeId, List.of()),
                    attemptMap.getOrDefault(nodeId, List.of()),
                    progressByNodeId.getOrDefault(nodeId, List.of())))
        .sorted(
            Comparator.comparing(InstructorAnalyticsDifficultyResponse.NodeItem::getDifficultyScore)
                .reversed())
        .toList();
  }

  private Map<Long, List<LessonProgress>> mapProgressesToNodes(
      Map<Long, Set<Long>> courseIdsByNodeId, List<LessonProgress> lessonProgresses) {
    Map<Long, Set<Long>> nodeIdsByCourseId = new LinkedHashMap<>();
    for (Map.Entry<Long, Set<Long>> entry : courseIdsByNodeId.entrySet()) {
      for (Long courseId : entry.getValue()) {
        nodeIdsByCourseId
            .computeIfAbsent(courseId, key -> new LinkedHashSet<>())
            .add(entry.getKey());
      }
    }

    Map<Long, List<LessonProgress>> progressByNodeId = new LinkedHashMap<>();
    for (LessonProgress lessonProgress : lessonProgresses) {
      Long courseId = lessonProgress.getLesson().getSection().getCourse().getCourseId();
      for (Long nodeId : nodeIdsByCourseId.getOrDefault(courseId, Set.of())) {
        progressByNodeId.computeIfAbsent(nodeId, key -> new ArrayList<>()).add(lessonProgress);
      }
    }
    return progressByNodeId;
  }

  private InstructorAnalyticsDifficultyResponse.NodeItem buildDifficultyItem(
      Long nodeId,
      String nodeTitle,
      List<Submission> submissions,
      List<QuizAttempt> attempts,
      List<LessonProgress> progresses) {
    long passedAttempts =
        attempts.stream().filter(attempt -> Boolean.TRUE.equals(attempt.getIsPassed())).count();
    double quizPassRate = metrics.percent(passedAttempts, attempts.size(), 2);
    double assignmentScoreRate =
        metrics.averageDoubles(
            submissions.stream()
                .map(submission -> metrics.assignmentScoreRate(submission, 2))
                .toList(),
            2);
    long completedCount =
        progresses.stream()
            .filter(progress -> Boolean.TRUE.equals(progress.getIsCompleted()))
            .count();
    double dropOffRate =
        progresses.isEmpty()
            ? 0.0
            : metrics.percent(progresses.size() - completedCount, progresses.size(), 2);
    double difficultyScore =
        metrics.round(
            ((100.0 - quizPassRate) * 0.4)
                + ((100.0 - assignmentScoreRate) * 0.35)
                + (dropOffRate * 0.25),
            2);

    return InstructorAnalyticsDifficultyResponse.NodeItem.builder()
        .nodeId(nodeId)
        .nodeTitle(nodeTitle)
        .difficultyScore(difficultyScore)
        .difficultyLabel(resolveDifficultyLabel(difficultyScore))
        .quizPassRate(metrics.round(quizPassRate, 2))
        .assignmentScoreRate(metrics.round(assignmentScoreRate, 2))
        .dropOffRate(metrics.round(dropOffRate, 2))
        .build();
  }

  private String buildWeakPointSummary(InstructorAnalyticsDifficultyResponse.NodeItem item) {
    return "Quiz pass rate "
        + metrics.round(item.getQuizPassRate(), 2)
        + "%, assignment score rate "
        + metrics.round(item.getAssignmentScoreRate(), 2)
        + "%, and drop-off rate "
        + metrics.round(item.getDropOffRate(), 2)
        + "% indicate concentrated weakness here.";
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
}
