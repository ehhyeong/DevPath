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
import com.devpath.domain.learning.entity.automation.AutomationRuleStatus;
import com.devpath.domain.learning.entity.clearance.ClearanceStatus;
import com.devpath.domain.learning.repository.LessonProgressRepository;
import com.devpath.domain.learning.repository.QuizAttemptRepository;
import com.devpath.domain.learning.repository.analytics.LearningMetricSampleRepository;
import com.devpath.domain.learning.repository.automation.AutomationMonitorSnapshotRepository;
import com.devpath.domain.learning.repository.automation.LearningAutomationRuleRepository;
import com.devpath.domain.learning.repository.clearance.NodeClearanceRepository;
import com.devpath.domain.learning.repository.proof.ProofCardRepository;
import com.devpath.domain.learning.repository.recommendation.RecommendationChangeRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
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
    private final LearningAutomationRuleRepository learningAutomationRuleRepository;
    private final LearningMetricSampleRepository learningMetricSampleRepository;
    private final AutomationMonitorSnapshotRepository automationMonitorSnapshotRepository;

    @Transactional
    public List<AdminLearningMetricResponse.Detail> getMetrics() {
        return List.of(
            getClearanceRate(),
            getRoadmapCompletionRate(),
            getLearningDuration(),
            getQuizQuality()
        );
    }

    @Transactional
    public AdminLearningMetricResponse.Detail getClearanceRate() {
        long totalCount = nodeClearanceRepository.count();
        long clearedCount = nodeClearanceRepository.findAll().stream()
            .filter(nodeClearance -> ClearanceStatus.CLEARED.equals(nodeClearance.getClearanceStatus()))
            .count();

        double clearanceRate = toPercent(clearedCount, totalCount);
        recordMetricSample(AnalyticsMetricType.OVERVIEW, "clearanceRate", clearanceRate);

        return AdminLearningMetricResponse.Detail.builder()
            .metricKey("clearanceRate")
            .metricName("Node clearance rate")
            .metricValue(clearanceRate)
            .description("Percentage of node clearance results that are CLEARED.")
            .measuredAt(LocalDateTime.now())
            .build();
    }

    @Transactional
    public AdminLearningMetricResponse.Detail getRoadmapCompletionRate() {
        List<CourseEnrollment> enrollments = courseEnrollmentRepository.findAll();
        long totalCount = enrollments.size();
        long completedCount = enrollments.stream()
            .filter(enrollment -> EnrollmentStatus.COMPLETED.equals(enrollment.getStatus()))
            .count();

        double roadmapCompletionRate = toPercent(completedCount, totalCount);
        recordMetricSample(AnalyticsMetricType.COMPLETION_RATE, "roadmapCompletionRate", roadmapCompletionRate);

        return AdminLearningMetricResponse.Detail.builder()
            .metricKey("roadmapCompletionRate")
            .metricName("Roadmap completion rate")
            .metricValue(roadmapCompletionRate)
            .description("Percentage of course enrollments in COMPLETED status.")
            .measuredAt(LocalDateTime.now())
            .build();
    }

    @Transactional
    public AdminLearningMetricResponse.Detail getLearningDuration() {
        List<LessonProgress> lessonProgresses = lessonProgressRepository.findAll();
        double averageLearningDuration = lessonProgresses.stream()
            .map(LessonProgress::getProgressSeconds)
            .filter(progressSeconds -> progressSeconds != null)
            .mapToInt(Integer::intValue)
            .average()
            .orElse(0.0);

        averageLearningDuration = round(averageLearningDuration);
        recordMetricSample(
            AnalyticsMetricType.AVERAGE_WATCH_TIME,
            "averageLearningDurationSeconds",
            averageLearningDuration
        );

        return AdminLearningMetricResponse.Detail.builder()
            .metricKey("learningDuration")
            .metricName("Average learning duration")
            .metricValue(averageLearningDuration)
            .description("Average lesson progress duration in seconds.")
            .measuredAt(LocalDateTime.now())
            .build();
    }

    @Transactional
    public AdminLearningMetricResponse.Detail getQuizQuality() {
        List<QuizAttempt> quizAttempts = quizAttemptRepository.findAll();

        double averageScoreRate = quizAttempts.stream()
            .mapToDouble(this::toScoreRate)
            .average()
            .orElse(0.0);

        long passedCount = quizAttempts.stream()
            .filter(quizAttempt -> Boolean.TRUE.equals(quizAttempt.getIsPassed()))
            .count();

        double passRate = toPercent(passedCount, quizAttempts.size());
        double quizQualityScore = round((averageScoreRate + passRate) / 2.0);

        recordMetricSample(AnalyticsMetricType.QUIZ_STATS, "quizQualityScore", quizQualityScore);

        return AdminLearningMetricResponse.Detail.builder()
            .metricKey("quizQuality")
            .metricName("Quiz quality score")
            .metricValue(quizQualityScore)
            .description("Average of score rate and pass rate.")
            .measuredAt(LocalDateTime.now())
            .build();
    }

    @Transactional
    public List<AdminLearningMetricResponse.AutomationMonitorDetail> getAutomationMonitor() {
        List<AdminLearningMetricResponse.AutomationMonitorDetail> monitors = List.of(
            createMonitorDetail("PROOF_CARD_AUTO_ISSUE", "Auto issue rule", isRuleEnabled("PROOF_CARD_AUTO_ISSUE", true)),
            createMonitorDetail("PROOF_CARD_MANUAL_ISSUE", "Manual issue rule", isRuleEnabled("PROOF_CARD_MANUAL_ISSUE", true)),
            createMonitorDetail(
                "RECOMMENDATION_CHANGE_ENABLED",
                "Recommendation change rule",
                isRuleEnabled("RECOMMENDATION_CHANGE_ENABLED", true)
            ),
            createMonitorDetail(
                "SUPPLEMENT_RECOMMENDATION_ENABLED",
                "Supplement recommendation rule",
                isRuleEnabled("SUPPLEMENT_RECOMMENDATION_ENABLED", true)
            )
        );

        monitors.forEach(this::recordMonitorSnapshot);
        return monitors;
    }

    @Transactional
    public AdminLearningMetricResponse.AnnualReportDetail getAnnualReport() {
        AdminLearningMetricResponse.Detail clearanceRate = getClearanceRate();
        AdminLearningMetricResponse.Detail roadmapCompletionRate = getRoadmapCompletionRate();
        AdminLearningMetricResponse.Detail learningDuration = getLearningDuration();
        AdminLearningMetricResponse.Detail quizQuality = getQuizQuality();
        List<AdminLearningMetricResponse.AutomationMonitorDetail> automationMonitors = getAutomationMonitor();

        long issuedProofCardCount = proofCardRepository.count();
        long recommendationChangeCount = recommendationChangeRepository.count();

        return AdminLearningMetricResponse.AnnualReportDetail.builder()
            .year(LocalDate.now().getYear())
            .clearanceRate(clearanceRate.getMetricValue())
            .roadmapCompletionRate(roadmapCompletionRate.getMetricValue())
            .averageLearningDurationSeconds(learningDuration.getMetricValue())
            .quizQualityScore(quizQuality.getMetricValue())
            .issuedProofCardCount(issuedProofCardCount)
            .recommendationChangeCount(recommendationChangeCount)
            .automationMonitors(automationMonitors)
            .build();
    }

    private AdminLearningMetricResponse.AutomationMonitorDetail createMonitorDetail(
        String monitorKey,
        String label,
        boolean enabled
    ) {
        return AdminLearningMetricResponse.AutomationMonitorDetail.builder()
            .monitorKey(monitorKey)
            .status(enabled ? AutomationMonitorStatus.HEALTHY.name() : AutomationMonitorStatus.WARNING.name())
            .snapshotValue(enabled ? 1.0 : 0.0)
            .snapshotMessage(enabled ? label + " is enabled." : label + " is disabled.")
            .measuredAt(LocalDateTime.now())
            .build();
    }

    private void recordMetricSample(AnalyticsMetricType metricType, String metricLabel, Double metricValue) {
        learningMetricSampleRepository.save(
            LearningMetricSample.builder()
                .metricType(metricType)
                .metricLabel(metricLabel)
                .metricValue(metricValue)
                .build()
        );
    }

    private void recordMonitorSnapshot(AdminLearningMetricResponse.AutomationMonitorDetail detail) {
        automationMonitorSnapshotRepository.save(
            AutomationMonitorSnapshot.builder()
                .monitorKey(detail.getMonitorKey())
                .status(AutomationMonitorStatus.valueOf(detail.getStatus()))
                .snapshotValue(detail.getSnapshotValue())
                .snapshotMessage(detail.getSnapshotMessage())
                .measuredAt(detail.getMeasuredAt())
                .build()
        );
    }

    private boolean isRuleEnabled(String ruleKey, boolean defaultValue) {
        return learningAutomationRuleRepository.findTopByRuleKeyOrderByPriorityDescIdDesc(ruleKey)
            .map(rule -> AutomationRuleStatus.ENABLED.equals(rule.getStatus()))
            .orElse(defaultValue);
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
