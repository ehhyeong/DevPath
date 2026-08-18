package com.devpath.api.admin.learning.service;

import com.devpath.api.admin.learning.dto.AdminLearningMetricResponse;
import com.devpath.domain.course.entity.CourseEnrollment;
import com.devpath.domain.course.entity.EnrollmentStatus;
import com.devpath.domain.course.repository.CourseEnrollmentRepository;
import com.devpath.domain.learning.entity.LessonProgress;
import com.devpath.domain.learning.entity.QuizAttempt;
import com.devpath.domain.learning.entity.analytics.AnalyticsMetricType;
import com.devpath.domain.learning.entity.analytics.LearningMetricSample;
import com.devpath.domain.learning.entity.automation.AutomationMonitorSnapshot;
import com.devpath.domain.learning.entity.automation.AutomationMonitorStatus;
import com.devpath.domain.learning.entity.clearance.ClearanceStatus;
import com.devpath.domain.learning.repository.LessonProgressRepository;
import com.devpath.domain.learning.repository.QuizAttemptRepository;
import com.devpath.domain.learning.repository.analytics.LearningMetricSampleRepository;
import com.devpath.domain.learning.repository.automation.AutomationMonitorSnapshotRepository;
import com.devpath.domain.learning.repository.clearance.NodeClearanceRepository;
import com.devpath.domain.learning.repository.proof.ProofCardRepository;
import com.devpath.domain.learning.repository.recommendation.RecommendationChangeRepository;
import com.devpath.domain.learning.service.LearningAutomationPolicyService;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Year;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// Admin learning metric service.
@Service
@RequiredArgsConstructor
public class AdminLearningMetricService {

  private final NodeClearanceRepository nodeClearanceRepository;
  private final CourseEnrollmentRepository courseEnrollmentRepository;
  private final LessonProgressRepository lessonProgressRepository;
  private final QuizAttemptRepository quizAttemptRepository;
  private final ProofCardRepository proofCardRepository;
  private final RecommendationChangeRepository recommendationChangeRepository;
  private final LearningMetricSampleRepository learningMetricSampleRepository;
  private final AutomationMonitorSnapshotRepository automationMonitorSnapshotRepository;
  private final LearningAutomationPolicyService learningAutomationPolicyService;

  @Transactional(readOnly = true)
  public List<AdminLearningMetricResponse.Detail> getMetrics() {
    return List.of(
        getClearanceRate(), getRoadmapCompletionRate(), getLearningDuration(), getQuizQuality());
  }

  @Transactional(readOnly = true)
  public AdminLearningMetricResponse.Detail getClearanceRate() {
    long totalCount = nodeClearanceRepository.count();
    long clearedCount =
        nodeClearanceRepository.findAll().stream()
            .filter(
                nodeClearance -> ClearanceStatus.CLEARED.equals(nodeClearance.getClearanceStatus()))
            .count();

    double clearanceRate = toPercent(clearedCount, totalCount);
    return AdminLearningMetricResponse.Detail.builder()
        .metricKey("clearanceRate")
        .metricName("Node clearance rate")
        .metricValue(clearanceRate)
        .description("Percentage of node clearance results that are CLEARED.")
        .measuredAt(LocalDateTime.now())
        .build();
  }

  @Transactional(readOnly = true)
  public AdminLearningMetricResponse.Detail getRoadmapCompletionRate() {
    List<CourseEnrollment> enrollments = courseEnrollmentRepository.findAll();
    long totalCount = enrollments.size();
    long completedCount =
        enrollments.stream()
            .filter(enrollment -> EnrollmentStatus.COMPLETED.equals(enrollment.getStatus()))
            .count();

    double roadmapCompletionRate = toPercent(completedCount, totalCount);
    return AdminLearningMetricResponse.Detail.builder()
        .metricKey("roadmapCompletionRate")
        .metricName("Roadmap completion rate")
        .metricValue(roadmapCompletionRate)
        .description("Percentage of course enrollments in COMPLETED status.")
        .measuredAt(LocalDateTime.now())
        .build();
  }

  @Transactional(readOnly = true)
  public AdminLearningMetricResponse.Detail getLearningDuration() {
    List<LessonProgress> lessonProgresses = lessonProgressRepository.findAll();
    double averageLearningDuration =
        lessonProgresses.stream()
            .map(LessonProgress::getProgressSeconds)
            .filter(progressSeconds -> progressSeconds != null)
            .mapToInt(Integer::intValue)
            .average()
            .orElse(0.0);

    averageLearningDuration = round(averageLearningDuration);
    return AdminLearningMetricResponse.Detail.builder()
        .metricKey("learningDuration")
        .metricName("Average learning duration")
        .metricValue(averageLearningDuration)
        .description("Average lesson progress duration in seconds.")
        .measuredAt(LocalDateTime.now())
        .build();
  }

  @Transactional(readOnly = true)
  public AdminLearningMetricResponse.Detail getQuizQuality() {
    List<QuizAttempt> quizAttempts = quizAttemptRepository.findAll();

    double averageScoreRate =
        quizAttempts.stream().mapToDouble(this::toScoreRate).average().orElse(0.0);

    long passedCount =
        quizAttempts.stream()
            .filter(quizAttempt -> Boolean.TRUE.equals(quizAttempt.getIsPassed()))
            .count();

    double passRate = toPercent(passedCount, quizAttempts.size());
    double quizQualityScore = round((averageScoreRate + passRate) / 2.0);

    return AdminLearningMetricResponse.Detail.builder()
        .metricKey("quizQuality")
        .metricName("Quiz quality score")
        .metricValue(quizQualityScore)
        .description("Average of score rate and pass rate.")
        .measuredAt(LocalDateTime.now())
        .build();
  }

  @Transactional(readOnly = true)
  public List<AdminLearningMetricResponse.AutomationMonitorDetail> getAutomationMonitor() {
    List<AdminLearningMetricResponse.AutomationMonitorDetail> monitors =
        List.of(
            createMonitorDetail(
                "PROOF_CARD_AUTO_ISSUE",
                "Auto issue rule",
                isRuleEnabled("PROOF_CARD_AUTO_ISSUE", true)),
            createMonitorDetail(
                "PROOF_CARD_MANUAL_ISSUE",
                "Manual issue rule",
                isRuleEnabled("PROOF_CARD_MANUAL_ISSUE", true)),
            createMonitorDetail(
                "RECOMMENDATION_CHANGE_ENABLED",
                "Recommendation change rule",
                isRuleEnabled("RECOMMENDATION_CHANGE_ENABLED", true)),
            createMonitorDetail(
                "SUPPLEMENT_RECOMMENDATION_ENABLED",
                "Supplement recommendation rule",
                isRuleEnabled("SUPPLEMENT_RECOMMENDATION_ENABLED", true)));

    return monitors;
  }

  @Transactional(readOnly = true)
  public AdminLearningMetricResponse.AnnualReportDetail getAnnualReport(Integer requestedYear) {
    int year = requestedYear == null ? Year.now().getValue() : requestedYear;
    if (year < 2000 || year > 2100) {
      throw new com.devpath.common.exception.CustomException(
          com.devpath.common.exception.ErrorCode.INVALID_INPUT, "조회 연도는 2000년부터 2100년 사이여야 합니다.");
    }
    LocalDateTime start = LocalDate.of(year, 1, 1).atStartOfDay();
    LocalDateTime end = start.plusYears(1);

    List<com.devpath.domain.learning.entity.clearance.NodeClearance> clearances =
        nodeClearanceRepository.findAll().stream()
            .filter(item -> isWithin(item.getLastCalculatedAt(), start, end))
            .toList();
    double clearanceRate =
        toPercent(
            clearances.stream()
                .filter(item -> ClearanceStatus.CLEARED.equals(item.getClearanceStatus()))
                .count(),
            clearances.size());

    List<CourseEnrollment> enrollments =
        courseEnrollmentRepository.findAll().stream()
            .filter(item -> isWithin(item.getEnrolledAt(), start, end))
            .toList();
    double roadmapCompletionRate =
        toPercent(
            enrollments.stream()
                .filter(item -> isWithin(item.getCompletedAt(), start, end))
                .count(),
            enrollments.size());

    double learningDuration =
        round(
            lessonProgressRepository.findAll().stream()
                .filter(item -> isWithin(item.getLastWatchedAt(), start, end))
                .map(LessonProgress::getProgressSeconds)
                .filter(java.util.Objects::nonNull)
                .mapToInt(Integer::intValue)
                .average()
                .orElse(0.0));
    List<QuizAttempt> quizAttempts =
        quizAttemptRepository.findAll().stream()
            .filter(item -> isWithin(item.getCompletedAt(), start, end))
            .toList();
    double scoreRate = quizAttempts.stream().mapToDouble(this::toScoreRate).average().orElse(0.0);
    double passRate =
        toPercent(
            quizAttempts.stream().filter(item -> Boolean.TRUE.equals(item.getIsPassed())).count(),
            quizAttempts.size());
    double quizQuality = round((scoreRate + passRate) / 2.0);
    List<AdminLearningMetricResponse.AutomationMonitorDetail> automationMonitors =
        getAutomationMonitor();

    long issuedProofCardCount =
        proofCardRepository.findAll().stream()
            .filter(item -> isWithin(item.getIssuedAt(), start, end))
            .count();
    long recommendationChangeCount =
        recommendationChangeRepository.findAll().stream()
            .filter(item -> isWithin(item.getSuggestedAt(), start, end))
            .count();

    return AdminLearningMetricResponse.AnnualReportDetail.builder()
        .year(year)
        .clearanceRate(clearanceRate)
        .roadmapCompletionRate(roadmapCompletionRate)
        .averageLearningDurationSeconds(learningDuration)
        .quizQualityScore(quizQuality)
        .issuedProofCardCount(issuedProofCardCount)
        .recommendationChangeCount(recommendationChangeCount)
        .automationMonitors(automationMonitors)
        .build();
  }

  public AdminLearningMetricResponse.AnnualReportDetail getAnnualReport() {
    return getAnnualReport(null);
  }

  @Transactional
  public void captureSnapshot() {
    List<AdminLearningMetricResponse.Detail> metrics = getMetrics();
    recordMetricSample(
        AnalyticsMetricType.OVERVIEW, "clearanceRate", metrics.get(0).getMetricValue());
    recordMetricSample(
        AnalyticsMetricType.COMPLETION_RATE,
        "roadmapCompletionRate",
        metrics.get(1).getMetricValue());
    recordMetricSample(
        AnalyticsMetricType.AVERAGE_WATCH_TIME,
        "averageLearningDurationSeconds",
        metrics.get(2).getMetricValue());
    recordMetricSample(
        AnalyticsMetricType.QUIZ_STATS, "quizQualityScore", metrics.get(3).getMetricValue());
    getAutomationMonitor().forEach(this::recordMonitorSnapshot);
  }

  private AdminLearningMetricResponse.AutomationMonitorDetail createMonitorDetail(
      String monitorKey, String label, boolean enabled) {
    return AdminLearningMetricResponse.AutomationMonitorDetail.builder()
        .monitorKey(monitorKey)
        .status(
            enabled
                ? AutomationMonitorStatus.HEALTHY.name()
                : AutomationMonitorStatus.WARNING.name())
        .snapshotValue(enabled ? 1.0 : 0.0)
        .snapshotMessage(enabled ? label + " is enabled." : label + " is disabled.")
        .measuredAt(LocalDateTime.now())
        .build();
  }

  private void recordMetricSample(
      AnalyticsMetricType metricType, String metricLabel, Double metricValue) {
    learningMetricSampleRepository.save(
        LearningMetricSample.builder()
            .metricType(metricType)
            .metricLabel(metricLabel)
            .metricValue(metricValue)
            .build());
  }

  private void recordMonitorSnapshot(AdminLearningMetricResponse.AutomationMonitorDetail detail) {
    automationMonitorSnapshotRepository.save(
        AutomationMonitorSnapshot.builder()
            .monitorKey(detail.getMonitorKey())
            .status(AutomationMonitorStatus.valueOf(detail.getStatus()))
            .snapshotValue(detail.getSnapshotValue())
            .snapshotMessage(detail.getSnapshotMessage())
            .measuredAt(detail.getMeasuredAt())
            .build());
  }

  private boolean isRuleEnabled(String ruleKey, boolean defaultValue) {
    return learningAutomationPolicyService.isEnabled(ruleKey, defaultValue);
  }

  private boolean isWithin(LocalDateTime value, LocalDateTime start, LocalDateTime end) {
    return value != null && !value.isBefore(start) && value.isBefore(end);
  }

  private double toScoreRate(QuizAttempt quizAttempt) {
    if (quizAttempt.getMaxScore() == null || quizAttempt.getMaxScore() <= 0) {
      return 0.0;
    }

    return ((double) quizAttempt.getScore() / (double) quizAttempt.getMaxScore()) * 100.0;
  }

  private double toPercent(long numerator, long denominator) {
    if (denominator <= 0L) {
      return 0.0;
    }

    return round(((double) numerator / (double) denominator) * 100.0);
  }

  private double round(double value) {
    return Math.round(value * 100.0) / 100.0;
  }
}
