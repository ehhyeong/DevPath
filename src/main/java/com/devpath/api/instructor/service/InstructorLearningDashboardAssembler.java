package com.devpath.api.instructor.service;

import com.devpath.api.instructor.dto.analytics.InstructorAnalyticsDashboardResponse;
import com.devpath.domain.analytics.service.InstructorAnalyticsMetrics;
import com.devpath.domain.course.entity.Course;
import com.devpath.domain.course.entity.CourseEnrollment;
import com.devpath.domain.course.entity.EnrollmentStatus;
import com.devpath.domain.course.entity.Lesson;
import com.devpath.domain.learning.entity.LessonProgress;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
class InstructorLearningDashboardAssembler {

  private final InstructorAnalyticsMetrics metrics;

  Sections assemble(
      List<Course> courses,
      List<CourseEnrollment> enrollments,
      List<Lesson> lessons,
      List<LessonProgress> progresses) {
    LinkedHashMap<Long, Course> coursesById =
        courses.stream()
            .collect(
                Collectors.toMap(
                    Course::getCourseId,
                    Function.identity(),
                    (left, right) -> left,
                    LinkedHashMap::new));
    Map<Long, List<CourseEnrollment>> enrollmentsByCourse =
        enrollments.stream()
            .collect(
                Collectors.groupingBy(
                    enrollment -> enrollment.getCourse().getCourseId(),
                    LinkedHashMap::new,
                    Collectors.toList()));
    Map<Long, List<LessonProgress>> progressesByCourse =
        progresses.stream()
            .collect(
                Collectors.groupingBy(
                    progress -> progress.getLesson().getSection().getCourse().getCourseId(),
                    LinkedHashMap::new,
                    Collectors.toList()));
    Map<String, List<LessonProgress>> progressesByLearnerCourse =
        progresses.stream()
            .collect(
                Collectors.groupingBy(
                    progress ->
                        learnerCourseKey(
                            progress.getUser().getId(),
                            progress.getLesson().getSection().getCourse().getCourseId())));

    return new Sections(
        buildOverview(courses, enrollments, lessons, progresses),
        buildStudents(enrollments, progressesByLearnerCourse),
        buildCourseProgressItems(coursesById, enrollmentsByCourse, progressesByCourse),
        buildCompletionRateItems(coursesById, enrollmentsByCourse),
        buildAverageWatchTimeItems(coursesById, progressesByCourse),
        buildDropOffItems(lessons, progresses),
        buildFunnel(enrollments, progresses));
  }

  private InstructorAnalyticsDashboardResponse.Overview buildOverview(
      List<Course> courses,
      List<CourseEnrollment> enrollments,
      List<Lesson> lessons,
      List<LessonProgress> progresses) {
    LocalDateTime activeThreshold = LocalDateTime.now().minusDays(30);
    Set<Long> activeLearnerIds = new LinkedHashSet<>();

    enrollments.stream()
        .filter(
            enrollment ->
                enrollment.getLastAccessedAt() != null
                    && enrollment.getLastAccessedAt().isAfter(activeThreshold))
        .map(enrollment -> enrollment.getUser().getId())
        .forEach(activeLearnerIds::add);
    progresses.stream()
        .filter(
            progress ->
                progress.getLastWatchedAt() != null
                    && progress.getLastWatchedAt().isAfter(activeThreshold))
        .map(progress -> progress.getUser().getId())
        .forEach(activeLearnerIds::add);

    long completedLessonCount =
        progresses.stream()
            .filter(progress -> Boolean.TRUE.equals(progress.getIsCompleted()))
            .map(progress -> progress.getLesson().getLessonId())
            .distinct()
            .count();

    double averageProgressPercent =
        roundToOneDecimal(
            enrollments.stream()
                .map(this::resolveEnrollmentProgress)
                .filter(Objects::nonNull)
                .mapToDouble(Double::doubleValue)
                .average()
                .orElse(0.0));

    return new InstructorAnalyticsDashboardResponse.Overview(
        courses.size(),
        courses.stream().filter(course -> course.getPublishedAt() != null).count(),
        enrollments.size(),
        activeLearnerIds.size(),
        lessons.size(),
        completedLessonCount,
        averageProgressPercent);
  }

  private List<InstructorAnalyticsDashboardResponse.StudentItem> buildStudents(
      List<CourseEnrollment> enrollments,
      Map<String, List<LessonProgress>> progressesByLearnerCourse) {
    return enrollments.stream()
        .map(
            enrollment -> {
              Double progress = resolveEnrollmentProgress(enrollment);
              if (progress == null) {
                progress =
                    roundToOneDecimal(
                        progressesByLearnerCourse
                            .getOrDefault(
                                learnerCourseKey(
                                    enrollment.getUser().getId(),
                                    enrollment.getCourse().getCourseId()),
                                List.of())
                            .stream()
                            .mapToInt(progressItem -> defaultInt(progressItem.getProgressPercent()))
                            .average()
                            .orElse(0.0));
              }

              return new InstructorAnalyticsDashboardResponse.StudentItem(
                  enrollment.getUser().getId(),
                  enrollment.getUser().getName(),
                  enrollment.getCourse().getCourseId(),
                  enrollment.getCourse().getTitle(),
                  enrollment.getStatus().name(),
                  progress,
                  isEnrollmentCompleted(enrollment, progress),
                  enrollment.getEnrolledAt(),
                  enrollment.getLastAccessedAt(),
                  enrollment.getCompletedAt());
            })
        .sorted(
            Comparator.comparing(
                InstructorAnalyticsDashboardResponse.StudentItem::lastAccessedAt,
                Comparator.nullsLast(Comparator.reverseOrder())))
        .toList();
  }

  private List<InstructorAnalyticsDashboardResponse.CourseProgressItem> buildCourseProgressItems(
      LinkedHashMap<Long, Course> coursesById,
      Map<Long, List<CourseEnrollment>> enrollmentsByCourse,
      Map<Long, List<LessonProgress>> progressesByCourse) {
    List<InstructorAnalyticsDashboardResponse.CourseProgressItem> items = new ArrayList<>();

    for (Map.Entry<Long, Course> entry : coursesById.entrySet()) {
      List<CourseEnrollment> enrollments =
          enrollmentsByCourse.getOrDefault(entry.getKey(), List.of());
      List<LessonProgress> progresses = progressesByCourse.getOrDefault(entry.getKey(), List.of());

      items.add(
          new InstructorAnalyticsDashboardResponse.CourseProgressItem(
              entry.getKey(),
              entry.getValue().getTitle(),
              enrollments.size(),
              enrollments.stream().filter(this::isEnrollmentCompleted).count(),
              roundToOneDecimal(
                  enrollments.stream()
                      .map(this::resolveEnrollmentProgress)
                      .filter(Objects::nonNull)
                      .mapToDouble(Double::doubleValue)
                      .average()
                      .orElse(0.0)),
              maxTime(
                  enrollments.stream()
                      .map(CourseEnrollment::getLastAccessedAt)
                      .filter(Objects::nonNull)
                      .max(LocalDateTime::compareTo)
                      .orElse(null),
                  progresses.stream()
                      .map(LessonProgress::getLastWatchedAt)
                      .filter(Objects::nonNull)
                      .max(LocalDateTime::compareTo)
                      .orElse(null))));
    }

    return items;
  }

  private List<InstructorAnalyticsDashboardResponse.CompletionRateItem> buildCompletionRateItems(
      LinkedHashMap<Long, Course> coursesById,
      Map<Long, List<CourseEnrollment>> enrollmentsByCourse) {
    return coursesById.entrySet().stream()
        .map(
            entry -> {
              List<CourseEnrollment> enrollments =
                  enrollmentsByCourse.getOrDefault(entry.getKey(), List.of());
              long completedCount =
                  enrollments.stream().filter(this::isEnrollmentCompleted).count();

              return new InstructorAnalyticsDashboardResponse.CompletionRateItem(
                  entry.getKey(),
                  entry.getValue().getTitle(),
                  enrollments.size(),
                  completedCount,
                  calculateRate(enrollments.size(), completedCount));
            })
        .toList();
  }

  private List<InstructorAnalyticsDashboardResponse.AverageWatchTimeItem>
      buildAverageWatchTimeItems(
          LinkedHashMap<Long, Course> coursesById,
          Map<Long, List<LessonProgress>> progressesByCourse) {
    return coursesById.entrySet().stream()
        .map(
            entry ->
                new InstructorAnalyticsDashboardResponse.AverageWatchTimeItem(
                    entry.getKey(),
                    entry.getValue().getTitle(),
                    roundToOneDecimal(
                        progressesByCourse.getOrDefault(entry.getKey(), List.of()).stream()
                            .mapToInt(progress -> defaultInt(progress.getProgressSeconds()))
                            .average()
                            .orElse(0.0))))
        .toList();
  }

  private List<InstructorAnalyticsDashboardResponse.DropOffItem> buildDropOffItems(
      List<Lesson> lessons, List<LessonProgress> progresses) {
    Map<Long, List<LessonProgress>> progressesByLesson =
        progresses.stream()
            .collect(
                Collectors.groupingBy(
                    progress -> progress.getLesson().getLessonId(),
                    LinkedHashMap::new,
                    Collectors.toList()));

    return lessons.stream()
        .map(
            lesson -> {
              List<LessonProgress> lessonProgresses =
                  progressesByLesson.getOrDefault(lesson.getLessonId(), List.of());
              long startedLearners = lessonProgresses.size();
              long completedLearners =
                  lessonProgresses.stream()
                      .filter(progress -> Boolean.TRUE.equals(progress.getIsCompleted()))
                      .count();

              return new InstructorAnalyticsDashboardResponse.DropOffItem(
                  lesson.getLessonId(),
                  lesson.getTitle(),
                  startedLearners,
                  completedLearners,
                  roundToOneDecimal(
                      lessonProgresses.stream()
                          .mapToInt(progress -> defaultInt(progress.getProgressSeconds()))
                          .average()
                          .orElse(0.0)),
                  startedLearners == 0
                      ? 0.0
                      : roundToOneDecimal(
                          ((startedLearners - completedLearners) * 100.0) / startedLearners));
            })
        .filter(item -> item.startedLearnerCount() > 0)
        .sorted(
            Comparator.comparing(InstructorAnalyticsDashboardResponse.DropOffItem::dropOffRate)
                .reversed())
        .limit(5)
        .toList();
  }

  private InstructorAnalyticsDashboardResponse.Funnel buildFunnel(
      List<CourseEnrollment> enrollments, List<LessonProgress> progresses) {
    long enrolledCount = enrollments.size();
    long startedCount =
        progresses.stream().map(progress -> progress.getUser().getId()).distinct().count();
    long halfwayCount =
        enrollments.stream()
            .map(this::resolveEnrollmentProgress)
            .filter(Objects::nonNull)
            .filter(progress -> progress >= 50.0)
            .count();
    long completedCount = enrollments.stream().filter(this::isEnrollmentCompleted).count();

    return new InstructorAnalyticsDashboardResponse.Funnel(
        List.of(
            new InstructorAnalyticsDashboardResponse.FunnelStep("Enrolled", enrolledCount),
            new InstructorAnalyticsDashboardResponse.FunnelStep("Started", startedCount),
            new InstructorAnalyticsDashboardResponse.FunnelStep("Halfway", halfwayCount),
            new InstructorAnalyticsDashboardResponse.FunnelStep("Completed", completedCount)));
  }

  private String learnerCourseKey(Long learnerId, Long courseId) {
    return learnerId + ":" + courseId;
  }

  private Double resolveEnrollmentProgress(CourseEnrollment enrollment) {
    if (enrollment.getProgressPercentage() == null) {
      return null;
    }
    return roundToOneDecimal(enrollment.getProgressPercentage());
  }

  private boolean isEnrollmentCompleted(CourseEnrollment enrollment) {
    return isEnrollmentCompleted(enrollment, resolveEnrollmentProgress(enrollment));
  }

  private boolean isEnrollmentCompleted(CourseEnrollment enrollment, Double progress) {
    return enrollment.getStatus() == EnrollmentStatus.COMPLETED
        || enrollment.getCompletedAt() != null
        || (progress != null && progress >= 100.0);
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

  private LocalDateTime maxTime(LocalDateTime left, LocalDateTime right) {
    if (left == null) {
      return right;
    }
    if (right == null) {
      return left;
    }
    return left.isAfter(right) ? left : right;
  }

  record Sections(
      InstructorAnalyticsDashboardResponse.Overview overview,
      List<InstructorAnalyticsDashboardResponse.StudentItem> students,
      List<InstructorAnalyticsDashboardResponse.CourseProgressItem> courseProgress,
      List<InstructorAnalyticsDashboardResponse.CompletionRateItem> completionRates,
      List<InstructorAnalyticsDashboardResponse.AverageWatchTimeItem> averageWatchTimes,
      List<InstructorAnalyticsDashboardResponse.DropOffItem> dropOffs,
      InstructorAnalyticsDashboardResponse.Funnel funnel) {}
}
