package com.devpath.api.analytics.service;

import com.devpath.api.analytics.dto.InstructorAnalyticsQuizResponse;
import com.devpath.domain.analytics.service.InstructorAnalyticsMetrics;
import com.devpath.domain.learning.entity.Quiz;
import com.devpath.domain.learning.entity.QuizAttempt;
import com.devpath.domain.learning.repository.QuizAttemptRepository;
import com.devpath.domain.learning.repository.QuizRepository;
import java.util.Comparator;
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
public class InstructorQuizAnalyticsService {

  private final QuizRepository quizRepository;
  private final QuizAttemptRepository quizAttemptRepository;
  private final InstructorAnalyticsMetrics metrics;
  private final InstructorAnalyticsScope analyticsScope;

  public InstructorAnalyticsQuizResponse.Detail getQuizStats(Long instructorId) {
    Set<Long> nodeIds = analyticsScope.loadNodeIds(instructorId);
    if (nodeIds.isEmpty()) {
      return emptyDetail();
    }

    List<QuizAttempt> attempts = loadAttempts(nodeIds);
    long passedAttempts =
        attempts.stream().filter(attempt -> Boolean.TRUE.equals(attempt.getIsPassed())).count();
    double averageScoreRate =
        metrics.averageDoubles(attempts.stream().map(this::toScoreRate).toList(), 2);
    int averageTimeSpentSeconds =
        (int)
            Math.round(
                metrics.averageIntegers(
                    attempts.stream()
                        .map(QuizAttempt::getTimeSpentSeconds)
                        .filter(value -> value != null)
                        .toList(),
                    2));

    return InstructorAnalyticsQuizResponse.Detail.builder()
        .summary(
            InstructorAnalyticsQuizResponse.Summary.builder()
                .totalAttempts((long) attempts.size())
                .passedAttempts(passedAttempts)
                .averageScoreRate(averageScoreRate)
                .averageTimeSpentSeconds(averageTimeSpentSeconds)
                .build())
        .items(buildQuestionPerformance(nodeIds, attempts))
        .build();
  }

  public List<InstructorAnalyticsQuizResponse.QuestionPerformanceItem> getQuestionPerformance(
      Long instructorId) {
    Set<Long> nodeIds = analyticsScope.loadNodeIds(instructorId);
    if (nodeIds.isEmpty()) {
      return List.of();
    }
    return buildQuestionPerformance(nodeIds, loadAttempts(nodeIds));
  }

  private List<InstructorAnalyticsQuizResponse.QuestionPerformanceItem> buildQuestionPerformance(
      Set<Long> nodeIds, List<QuizAttempt> attempts) {
    List<Quiz> quizzes =
        quizRepository.findAllByRoadmapNodeNodeIdInAndIsDeletedFalseOrderByCreatedAtDesc(nodeIds);
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
                  .passRate(metrics.percent(passedCount, quizAttempts.size(), 2))
                  .averageScoreRate(
                      metrics.averageDoubles(
                          quizAttempts.stream().map(this::toScoreRate).toList(), 2))
                  .build();
            })
        .sorted(
            Comparator.comparing(
                    InstructorAnalyticsQuizResponse.QuestionPerformanceItem::getAttemptCount)
                .reversed())
        .toList();
  }

  private List<QuizAttempt> loadAttempts(Set<Long> nodeIds) {
    return quizAttemptRepository
        .findAllByQuizRoadmapNodeNodeIdInAndIsDeletedFalseOrderByCreatedAtDesc(nodeIds);
  }

  private double toScoreRate(QuizAttempt attempt) {
    return metrics.quizScoreRate(attempt, 2);
  }

  private InstructorAnalyticsQuizResponse.Detail emptyDetail() {
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
}
