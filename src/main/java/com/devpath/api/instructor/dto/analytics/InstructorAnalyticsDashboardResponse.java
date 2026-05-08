package com.devpath.api.instructor.dto.analytics;

import com.devpath.api.instructor.dto.course.InstructorCourseListResponse;
import java.time.LocalDateTime;
import java.util.List;

public record InstructorAnalyticsDashboardResponse(
    Overview overview,
    List<InstructorCourseListResponse> courseOptions,
    List<StudentItem> students,
    List<CourseProgressItem> courseProgress,
    List<CompletionRateItem> completionRates,
    List<AverageWatchTimeItem> averageWatchTimes,
    List<DropOffItem> dropOffs,
    List<DifficultyItem> difficultyItems,
    QuizStats quizStats,
    AssignmentStats assignmentStats,
    Funnel funnel,
    List<WeakPointItem> weakPoints) {

  public static InstructorAnalyticsDashboardResponse empty(
      List<InstructorCourseListResponse> courseOptions) {
    return new InstructorAnalyticsDashboardResponse(
        new Overview(0, 0, 0, 0, 0, 0, 0.0),
        courseOptions,
        List.of(),
        List.of(),
        List.of(),
        List.of(),
        List.of(),
        List.of(),
        QuizStats.empty(),
        AssignmentStats.empty(),
        new Funnel(List.of()),
        List.of());
  }

  public record Overview(
      long courseCount,
      long publishedCourseCount,
      long totalStudentCount,
      long activeStudentCount,
      long totalLessonCount,
      long completedLessonCount,
      double averageProgressPercent) {}

  public record StudentItem(
      Long studentId,
      String studentName,
      Long courseId,
      String courseTitle,
      String enrollmentStatus,
      Double progressPercent,
      boolean completed,
      LocalDateTime enrolledAt,
      LocalDateTime lastAccessedAt,
      LocalDateTime completedAt) {}

  public record CourseProgressItem(
      Long courseId,
      String courseTitle,
      long enrolledStudentCount,
      long completedStudentCount,
      double averageProgressPercent,
      LocalDateTime lastActivityAt) {}

  public record CompletionRateItem(
      Long courseId,
      String courseTitle,
      long enrolledStudentCount,
      long completedStudentCount,
      double completionRate) {}

  public record AverageWatchTimeItem(
      Long courseId, String courseTitle, double averageWatchSeconds) {}

  public record DropOffItem(
      Long lessonId,
      String lessonTitle,
      long startedLearnerCount,
      long completedLearnerCount,
      double averageWatchSeconds,
      double dropOffRate) {}

  public record DifficultyItem(
      Long nodeId,
      String nodeTitle,
      double difficultyScore,
      String difficultyLabel,
      double quizPassRate,
      double assignmentScoreRate,
      double dropOffRate) {}

  public record QuizStats(QuizSummary summary, List<QuizItem> items) {
    public static QuizStats empty() {
      return new QuizStats(new QuizSummary(0, 0, 0.0, 0.0), List.of());
    }
  }

  public record QuizSummary(
      long totalAttempts,
      long passedAttempts,
      double averageScoreRate,
      double averageTimeSpentSeconds) {}

  public record QuizItem(
      Long quizId,
      String quizTitle,
      String nodeTitle,
      int questionCount,
      long attemptCount,
      double passRate,
      double averageScoreRate) {}

  public record AssignmentStats(AssignmentSummary summary, List<AssignmentItem> items) {
    public static AssignmentStats empty() {
      return new AssignmentStats(new AssignmentSummary(0, 0, 0.0, 0.0), List.of());
    }
  }

  public record AssignmentSummary(
      long totalSubmissions, long gradedSubmissions, double averageScore, double passRate) {}

  public record AssignmentItem(
      Long nodeId, String nodeTitle, long submissionCount, long gradedCount, double averageScore) {}

  public record Funnel(List<FunnelStep> steps) {}

  public record FunnelStep(String stepName, long value) {}

  public record WeakPointItem(
      Long nodeId, String nodeTitle, double weaknessScore, String summary) {}
}
