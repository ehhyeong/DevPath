package com.devpath.api.instructor.service;

import com.devpath.api.analytics.service.InstructorAnalyticsMetrics;
import com.devpath.api.instructor.dto.analytics.InstructorAnalyticsDashboardResponse;
import com.devpath.domain.learning.entity.QuizAttempt;
import com.devpath.domain.learning.entity.Submission;
import com.devpath.domain.learning.entity.SubmissionStatus;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
class InstructorAssessmentDashboardAssembler {

  private final InstructorAnalyticsMetrics metrics;

  Sections assemble(
      List<QuizAttempt> quizAttempts,
      List<Submission> submissions,
      List<InstructorAnalyticsDashboardResponse.DropOffItem> dropOffs) {
    List<InstructorAnalyticsDashboardResponse.DifficultyItem> difficultyItems =
        buildDifficultyItems(quizAttempts, submissions, dropOffs);
    List<InstructorAnalyticsDashboardResponse.WeakPointItem> weakPoints =
        buildWeakPoints(difficultyItems);

    return new Sections(
        difficultyItems,
        buildQuizStats(quizAttempts),
        buildAssignmentStats(submissions),
        weakPoints,
        buildRuleBasedAiInsights(difficultyItems, weakPoints, dropOffs));
  }

  private InstructorAnalyticsDashboardResponse.QuizStats buildQuizStats(
      List<QuizAttempt> quizAttempts) {
    if (quizAttempts.isEmpty()) {
      return InstructorAnalyticsDashboardResponse.QuizStats.empty();
    }

    Map<Long, List<QuizAttempt>> attemptsByQuiz =
        quizAttempts.stream()
            .collect(
                Collectors.groupingBy(
                    attempt -> attempt.getQuiz().getId(), LinkedHashMap::new, Collectors.toList()));

    List<InstructorAnalyticsDashboardResponse.QuizItem> items =
        attemptsByQuiz.values().stream()
            .map(
                attempts -> {
                  QuizAttempt sample = attempts.get(0);
                  long passedCount =
                      attempts.stream()
                          .filter(attempt -> Boolean.TRUE.equals(attempt.getIsPassed()))
                          .count();

                  return new InstructorAnalyticsDashboardResponse.QuizItem(
                      sample.getQuiz().getId(),
                      sample.getQuiz().getTitle(),
                      sample.getQuiz().getRoadmapNode().getTitle(),
                      sample.getQuiz().getQuestions().size(),
                      attempts.size(),
                      calculateRate(attempts.size(), passedCount),
                      roundToOneDecimal(
                          attempts.stream()
                              .mapToDouble(this::calculateScoreRate)
                              .average()
                              .orElse(0.0)));
                })
            .sorted(
                Comparator.comparing(InstructorAnalyticsDashboardResponse.QuizItem::attemptCount)
                    .reversed())
            .toList();

    long passedAttempts =
        quizAttempts.stream().filter(attempt -> Boolean.TRUE.equals(attempt.getIsPassed())).count();

    return new InstructorAnalyticsDashboardResponse.QuizStats(
        new InstructorAnalyticsDashboardResponse.QuizSummary(
            quizAttempts.size(),
            passedAttempts,
            roundToOneDecimal(
                quizAttempts.stream().mapToDouble(this::calculateScoreRate).average().orElse(0.0)),
            roundToOneDecimal(
                quizAttempts.stream()
                    .mapToInt(attempt -> defaultInt(attempt.getTimeSpentSeconds()))
                    .average()
                    .orElse(0.0))),
        items);
  }

  private InstructorAnalyticsDashboardResponse.AssignmentStats buildAssignmentStats(
      List<Submission> submissions) {
    if (submissions.isEmpty()) {
      return InstructorAnalyticsDashboardResponse.AssignmentStats.empty();
    }

    Map<Long, List<Submission>> submissionsByNode =
        submissions.stream()
            .collect(
                Collectors.groupingBy(
                    submission -> submission.getAssignment().getRoadmapNode().getNodeId(),
                    LinkedHashMap::new,
                    Collectors.toList()));

    List<InstructorAnalyticsDashboardResponse.AssignmentItem> items =
        submissionsByNode.values().stream()
            .map(
                nodeSubmissions -> {
                  Submission sample = nodeSubmissions.get(0);
                  List<Submission> graded =
                      nodeSubmissions.stream().filter(this::isSubmissionGraded).toList();

                  return new InstructorAnalyticsDashboardResponse.AssignmentItem(
                      sample.getAssignment().getRoadmapNode().getNodeId(),
                      sample.getAssignment().getRoadmapNode().getTitle(),
                      nodeSubmissions.size(),
                      graded.size(),
                      roundToOneDecimal(
                          graded.stream()
                              .mapToDouble(submission -> defaultInt(submission.getTotalScore()))
                              .average()
                              .orElse(0.0)));
                })
            .sorted(
                Comparator.comparing(
                        InstructorAnalyticsDashboardResponse.AssignmentItem::submissionCount)
                    .reversed())
            .toList();

    List<Submission> gradedSubmissions =
        submissions.stream().filter(this::isSubmissionGraded).toList();
    long passedCount = gradedSubmissions.stream().filter(this::isSubmissionPassed).count();

    return new InstructorAnalyticsDashboardResponse.AssignmentStats(
        new InstructorAnalyticsDashboardResponse.AssignmentSummary(
            submissions.size(),
            gradedSubmissions.size(),
            roundToOneDecimal(
                gradedSubmissions.stream()
                    .mapToDouble(submission -> defaultInt(submission.getTotalScore()))
                    .average()
                    .orElse(0.0)),
            calculateRate(gradedSubmissions.size(), passedCount)),
        items);
  }

  private List<InstructorAnalyticsDashboardResponse.DifficultyItem> buildDifficultyItems(
      List<QuizAttempt> quizAttempts,
      List<Submission> submissions,
      List<InstructorAnalyticsDashboardResponse.DropOffItem> dropOffs) {
    double overallDropOffRate =
        roundToOneDecimal(
            dropOffs.stream()
                .mapToDouble(InstructorAnalyticsDashboardResponse.DropOffItem::dropOffRate)
                .average()
                .orElse(0.0));

    Map<Long, List<QuizAttempt>> attemptsByNode =
        quizAttempts.stream()
            .collect(
                Collectors.groupingBy(
                    attempt -> attempt.getQuiz().getRoadmapNode().getNodeId(),
                    LinkedHashMap::new,
                    Collectors.toList()));
    Map<Long, List<Submission>> submissionsByNode =
        submissions.stream()
            .collect(
                Collectors.groupingBy(
                    submission -> submission.getAssignment().getRoadmapNode().getNodeId(),
                    LinkedHashMap::new,
                    Collectors.toList()));
    Set<Long> nodeIds = new LinkedHashSet<>();
    nodeIds.addAll(attemptsByNode.keySet());
    nodeIds.addAll(submissionsByNode.keySet());

    return nodeIds.stream()
        .map(
            nodeId -> {
              List<QuizAttempt> nodeAttempts = attemptsByNode.getOrDefault(nodeId, List.of());
              List<Submission> nodeSubmissions = submissionsByNode.getOrDefault(nodeId, List.of());
              double quizPassRate =
                  nodeAttempts.isEmpty()
                      ? 0.0
                      : calculateRate(
                          nodeAttempts.size(),
                          nodeAttempts.stream()
                              .filter(attempt -> Boolean.TRUE.equals(attempt.getIsPassed()))
                              .count());
              double assignmentScoreRate =
                  roundToOneDecimal(
                      nodeSubmissions.stream()
                          .filter(this::isSubmissionGraded)
                          .mapToDouble(this::calculateAssignmentScoreRate)
                          .average()
                          .orElse(0.0));
              double difficultyScore =
                  roundToOneDecimal(
                      ((100.0 - quizPassRate) * 0.45)
                          + ((100.0 - assignmentScoreRate) * 0.35)
                          + (overallDropOffRate * 0.20));
              String nodeTitle =
                  nodeAttempts.isEmpty()
                      ? nodeSubmissions.get(0).getAssignment().getRoadmapNode().getTitle()
                      : nodeAttempts.get(0).getQuiz().getRoadmapNode().getTitle();

              return new InstructorAnalyticsDashboardResponse.DifficultyItem(
                  nodeId,
                  nodeTitle,
                  difficultyScore,
                  difficultyLabel(difficultyScore),
                  quizPassRate,
                  assignmentScoreRate,
                  overallDropOffRate);
            })
        .sorted(
            Comparator.comparing(
                    InstructorAnalyticsDashboardResponse.DifficultyItem::difficultyScore)
                .reversed())
        .limit(6)
        .toList();
  }

  private List<InstructorAnalyticsDashboardResponse.WeakPointItem> buildWeakPoints(
      List<InstructorAnalyticsDashboardResponse.DifficultyItem> difficultyItems) {
    return difficultyItems.stream()
        .limit(3)
        .map(
            item ->
                new InstructorAnalyticsDashboardResponse.WeakPointItem(
                    item.nodeId(),
                    item.nodeTitle(),
                    item.difficultyScore(),
                    buildWeakPointSummary(item)))
        .toList();
  }

  private List<InstructorAnalyticsDashboardResponse.AiInsightItem> buildRuleBasedAiInsights(
      List<InstructorAnalyticsDashboardResponse.DifficultyItem> difficultyItems,
      List<InstructorAnalyticsDashboardResponse.WeakPointItem> weakPoints,
      List<InstructorAnalyticsDashboardResponse.DropOffItem> dropOffs) {
    List<InstructorAnalyticsDashboardResponse.AiInsightItem> insights = new ArrayList<>();

    difficultyItems.stream()
        .limit(2)
        .forEach(
            item ->
                insights.add(
                    new InstructorAnalyticsDashboardResponse.AiInsightItem(
                        item.nodeTitle() + " 보강",
                        "%s 구간은 퀴즈 통과율 %.1f%%, 과제 점수 %.1f%%라서 예제와 중간 점검 문항을 추가하는 것이 좋습니다."
                            .formatted(
                                item.nodeTitle(), item.quizPassRate(), item.assignmentScoreRate()),
                        item.difficultyLabel())));
    weakPoints.stream()
        .findFirst()
        .ifPresent(
            item ->
                insights.add(
                    new InstructorAnalyticsDashboardResponse.AiInsightItem(
                        "오답 패턴 재설계",
                        "%s 오답 신호가 높습니다. 핵심 개념 설명 뒤 바로 따라 하는 실습을 붙여 회복 동선을 짧게 가져가세요."
                            .formatted(item.nodeTitle()),
                        item.weaknessScore() >= 65.0
                            ? "HIGH"
                            : item.weaknessScore() >= 40.0 ? "MEDIUM" : "LOW")));
    dropOffs.stream()
        .findFirst()
        .ifPresent(
            item ->
                insights.add(
                    new InstructorAnalyticsDashboardResponse.AiInsightItem(
                        "이탈 구간 분할",
                        "%s에서 이탈률이 %.1f%%입니다. 긴 설명을 5분 안쪽 단위로 나누고 체크 질문을 추가하세요."
                            .formatted(item.lessonTitle(), item.dropOffRate()),
                        item.dropOffRate() >= 40.0
                            ? "HIGH"
                            : item.dropOffRate() >= 20.0 ? "MEDIUM" : "LOW")));

    return insights.stream().limit(3).toList();
  }

  private boolean isSubmissionGraded(Submission submission) {
    return submission.getSubmissionStatus() == SubmissionStatus.GRADED
        || submission.getGradedAt() != null;
  }

  private boolean isSubmissionPassed(Submission submission) {
    return calculateAssignmentScoreRate(submission) >= 60.0;
  }

  private double calculateAssignmentScoreRate(Submission submission) {
    return metrics.assignmentScoreRate(submission, 1);
  }

  private double calculateScoreRate(QuizAttempt attempt) {
    return metrics.quizScoreRate(attempt, 1);
  }

  private double calculateRate(long denominator, long numerator) {
    return metrics.percent(numerator, denominator, 1);
  }

  private int defaultInt(Integer value) {
    return metrics.safeInt(value);
  }

  private double roundToOneDecimal(double value) {
    return metrics.round(value, 1);
  }

  private String difficultyLabel(double difficultyScore) {
    if (difficultyScore >= 65.0) {
      return "HIGH";
    }
    if (difficultyScore >= 40.0) {
      return "MEDIUM";
    }
    return "LOW";
  }

  private String buildWeakPointSummary(InstructorAnalyticsDashboardResponse.DifficultyItem item) {
    if (item.quizPassRate() < 60.0 && item.assignmentScoreRate() < 60.0) {
      return "퀴즈와 과제 결과가 모두 낮습니다. 이 구간에 보강 자료와 단계별 실습을 추가하세요.";
    }
    if (item.quizPassRate() < 60.0) {
      return "퀴즈 통과율이 낮습니다. 개념 설명과 추가 예제를 보강하는 것이 좋습니다.";
    }
    if (item.assignmentScoreRate() < 60.0) {
      return "과제 점수가 낮습니다. 따라 할 수 있는 가이드 실습 과제를 추가하세요.";
    }
    return "이 구간 주변의 이탈률이 높습니다. 콘텐츠를 더 작은 단계로 나누는 것이 좋습니다.";
  }

  record Sections(
      List<InstructorAnalyticsDashboardResponse.DifficultyItem> difficultyItems,
      InstructorAnalyticsDashboardResponse.QuizStats quizStats,
      InstructorAnalyticsDashboardResponse.AssignmentStats assignmentStats,
      List<InstructorAnalyticsDashboardResponse.WeakPointItem> weakPoints,
      List<InstructorAnalyticsDashboardResponse.AiInsightItem> aiInsights) {}
}
