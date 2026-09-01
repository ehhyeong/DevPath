package com.devpath.api.analytics.service;

import com.devpath.api.analytics.dto.InstructorAnalyticsDropOffResponse;
import com.devpath.api.analytics.dto.InstructorAnalyticsFunnelResponse;
import com.devpath.api.analytics.dto.InstructorAnalyticsOverviewResponse;
import com.devpath.api.analytics.dto.InstructorAnalyticsProgressResponse;
import com.devpath.api.analytics.dto.InstructorAnalyticsStudentResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.course.entity.Course;
import com.devpath.domain.course.entity.CourseEnrollment;
import com.devpath.domain.course.entity.CourseStatus;
import com.devpath.domain.course.entity.EnrollmentStatus;
import com.devpath.domain.course.entity.Lesson;
import com.devpath.domain.course.repository.CourseEnrollmentRepository;
import com.devpath.domain.course.repository.CourseNodeMappingRepository;
import com.devpath.domain.course.repository.CourseRepository;
import com.devpath.domain.course.repository.LessonRepository;
import com.devpath.domain.learning.entity.LessonProgress;
import com.devpath.domain.learning.entity.Submission;
import com.devpath.domain.learning.repository.LessonProgressRepository;
import com.devpath.domain.learning.repository.SubmissionRepository;
import com.devpath.domain.user.repository.UserRepository;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.Comparator;
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
public class InstructorLearningProgressAnalyticsService {

  private final UserRepository userRepository;
  private final CourseRepository courseRepository;
  private final CourseEnrollmentRepository courseEnrollmentRepository;
  private final CourseNodeMappingRepository courseNodeMappingRepository;
  private final LessonRepository lessonRepository;
  private final LessonProgressRepository lessonProgressRepository;
  private final SubmissionRepository submissionRepository;
  private final InstructorAnalyticsMetrics metrics;

  public InstructorAnalyticsOverviewResponse.Detail getOverview(Long instructorId) {
    validateInstructor(instructorId);

    List<Course> courses = loadCourses(instructorId);
    List<CourseEnrollment> enrollments = loadEnrollments(instructorId);

    long totalStudentCount =
        enrollments.stream().map(enrollment -> enrollment.getUser().getId()).distinct().count();

    long activeStudentCount =
        enrollments.stream()
            .filter(enrollment -> EnrollmentStatus.ACTIVE.equals(enrollment.getStatus()))
            .map(enrollment -> enrollment.getUser().getId())
            .distinct()
            .count();

    long totalLessonCount =
        lessonRepository.countBySectionCourseInstructorIdAndIsPublishedTrue(instructorId);
    long completedLessonCount =
        lessonProgressRepository.countByInstructorIdAndIsCompletedTrue(instructorId);
    double averageProgressPercent =
        averageInteger(
            enrollments.stream()
                .map(CourseEnrollment::getProgressPercentage)
                .filter(progress -> progress != null)
                .toList());

    long publishedCourseCount =
        courses.stream()
            .filter(course -> CourseStatus.PUBLISHED.equals(course.getStatus()))
            .count();

    return InstructorAnalyticsOverviewResponse.Detail.builder()
        .courseCount((long) courses.size())
        .publishedCourseCount(publishedCourseCount)
        .totalStudentCount(totalStudentCount)
        .activeStudentCount(activeStudentCount)
        .totalLessonCount(totalLessonCount)
        .completedLessonCount(completedLessonCount)
        .averageProgressPercent(averageProgressPercent)
        .build();
  }

  public List<InstructorAnalyticsStudentResponse.StudentItem> getStudents(Long instructorId) {
    validateInstructor(instructorId);
    return loadEnrollments(instructorId).stream().map(this::toStudentItem).toList();
  }

  public List<InstructorAnalyticsProgressResponse.CourseProgressItem> getProgress(
      Long instructorId) {
    validateInstructor(instructorId);

    List<Course> courses = loadCourses(instructorId);
    List<CourseEnrollment> enrollments = loadEnrollments(instructorId);
    Map<Long, List<CourseEnrollment>> enrollmentMap =
        enrollments.stream()
            .collect(Collectors.groupingBy(enrollment -> enrollment.getCourse().getCourseId()));

    return courses.stream()
        .map(
            course -> {
              List<CourseEnrollment> courseEnrollments =
                  enrollmentMap.getOrDefault(course.getCourseId(), List.of());

              return InstructorAnalyticsProgressResponse.CourseProgressItem.builder()
                  .courseId(course.getCourseId())
                  .courseTitle(course.getTitle())
                  .enrolledStudentCount((long) courseEnrollments.size())
                  .completedStudentCount(
                      (long)
                          courseEnrollments.stream()
                              .filter(
                                  enrollment ->
                                      EnrollmentStatus.COMPLETED.equals(enrollment.getStatus()))
                              .count())
                  .averageProgressPercent(
                      averageInteger(
                          courseEnrollments.stream()
                              .map(CourseEnrollment::getProgressPercentage)
                              .filter(progress -> progress != null)
                              .toList()))
                  .lastActivityAt(
                      maxDateTime(
                          courseEnrollments.stream()
                              .map(CourseEnrollment::getLastAccessedAt)
                              .filter(value -> value != null)
                              .toList()))
                  .build();
            })
        .toList();
  }

  public List<InstructorAnalyticsProgressResponse.CompletionRateItem> getCompletionRate(
      Long instructorId) {
    validateInstructor(instructorId);

    List<Course> courses = loadCourses(instructorId);
    List<CourseEnrollment> enrollments = loadEnrollments(instructorId);
    Map<Long, List<CourseEnrollment>> enrollmentMap =
        enrollments.stream()
            .collect(Collectors.groupingBy(enrollment -> enrollment.getCourse().getCourseId()));

    return courses.stream()
        .map(
            course -> {
              List<CourseEnrollment> courseEnrollments =
                  enrollmentMap.getOrDefault(course.getCourseId(), List.of());
              long enrolledCount = courseEnrollments.size();
              long completedCount =
                  courseEnrollments.stream()
                      .filter(
                          enrollment -> EnrollmentStatus.COMPLETED.equals(enrollment.getStatus()))
                      .count();

              return InstructorAnalyticsProgressResponse.CompletionRateItem.builder()
                  .courseId(course.getCourseId())
                  .courseTitle(course.getTitle())
                  .enrolledStudentCount(enrolledCount)
                  .completedStudentCount(completedCount)
                  .completionRate(toPercent(completedCount, enrolledCount))
                  .build();
            })
        .toList();
  }

  public List<InstructorAnalyticsProgressResponse.AverageWatchTimeItem> getAverageWatchTime(
      Long instructorId) {
    validateInstructor(instructorId);

    List<Course> courses = loadCourses(instructorId);
    List<LessonProgress> lessonProgresses =
        lessonProgressRepository.findAllByInstructorId(instructorId);
    Map<Long, List<LessonProgress>> progressMap =
        lessonProgresses.stream()
            .collect(
                Collectors.groupingBy(
                    progress -> progress.getLesson().getSection().getCourse().getCourseId()));

    return courses.stream()
        .map(
            course ->
                InstructorAnalyticsProgressResponse.AverageWatchTimeItem.builder()
                    .courseId(course.getCourseId())
                    .courseTitle(course.getTitle())
                    .averageWatchSeconds(
                        (int)
                            Math.round(
                                averageInteger(
                                    progressMap
                                        .getOrDefault(course.getCourseId(), List.of())
                                        .stream()
                                        .map(LessonProgress::getProgressSeconds)
                                        .filter(progressSeconds -> progressSeconds != null)
                                        .toList())))
                    .build())
        .toList();
  }

  public List<InstructorAnalyticsDropOffResponse.LessonItem> getDropOff(Long instructorId) {
    validateInstructor(instructorId);

    List<Lesson> lessons =
        lessonRepository.findAllBySectionCourseInstructorIdAndIsPublishedTrue(instructorId);
    List<LessonProgress> lessonProgresses =
        lessonProgressRepository.findAllByInstructorId(instructorId);
    Map<Long, List<LessonProgress>> progressMap =
        lessonProgresses.stream()
            .collect(Collectors.groupingBy(progress -> progress.getLesson().getLessonId()));

    return lessons.stream()
        .map(
            lesson -> {
              List<LessonProgress> lessonItems =
                  progressMap.getOrDefault(lesson.getLessonId(), List.of());
              long startedCount = lessonItems.size();
              long completedCount =
                  lessonItems.stream()
                      .filter(progress -> Boolean.TRUE.equals(progress.getIsCompleted()))
                      .count();

              return InstructorAnalyticsDropOffResponse.LessonItem.builder()
                  .lessonId(lesson.getLessonId())
                  .lessonTitle(lesson.getTitle())
                  .startedLearnerCount(startedCount)
                  .completedLearnerCount(completedCount)
                  .averageWatchSeconds(
                      (int)
                          Math.round(
                              averageInteger(
                                  lessonItems.stream()
                                      .map(LessonProgress::getProgressSeconds)
                                      .filter(value -> value != null)
                                      .toList())))
                  .dropOffRate(
                      startedCount == 0
                          ? 0.0
                          : toPercent(startedCount - completedCount, startedCount))
                  .build();
            })
        .sorted(
            Comparator.comparing(InstructorAnalyticsDropOffResponse.LessonItem::getDropOffRate)
                .reversed())
        .toList();
  }

  public List<InstructorAnalyticsStudentResponse.StudentItem> getStudentProgress(
      Long instructorId) {
    validateInstructor(instructorId);

    return loadEnrollments(instructorId).stream()
        .map(this::toStudentItem)
        .sorted(
            Comparator.comparing(
                    InstructorAnalyticsStudentResponse.StudentItem::getProgressPercent,
                    Comparator.nullsLast(Integer::compareTo))
                .reversed()
                .thenComparing(
                    InstructorAnalyticsStudentResponse.StudentItem::getLastAccessedAt,
                    Comparator.nullsLast(LocalDateTime::compareTo))
                .reversed())
        .toList();
  }

  public InstructorAnalyticsFunnelResponse.Detail getFunnel(Long instructorId) {
    validateInstructor(instructorId);

    List<CourseEnrollment> enrollments = loadEnrollments(instructorId);
    List<LessonProgress> lessonProgresses =
        lessonProgressRepository.findAllByInstructorId(instructorId);
    Set<Long> nodeIds = loadNodeIds(instructorId);
    List<Submission> submissions =
        nodeIds.isEmpty()
            ? List.of()
            : submissionRepository
                .findAllByAssignmentRoadmapNodeNodeIdInAndIsDeletedFalseOrderBySubmittedAtDesc(
                    nodeIds);

    long enrolled =
        enrollments.stream().map(enrollment -> enrollment.getUser().getId()).distinct().count();
    long started =
        lessonProgresses.stream().map(progress -> progress.getUser().getId()).distinct().count();
    long progressed =
        enrollments.stream()
            .filter(
                enrollment ->
                    enrollment.getProgressPercentage() != null
                        && enrollment.getProgressPercentage() >= 50)
            .map(enrollment -> enrollment.getUser().getId())
            .distinct()
            .count();
    long submitted =
        submissions.stream().map(submission -> submission.getLearner().getId()).distinct().count();
    long completed =
        enrollments.stream()
            .filter(enrollment -> EnrollmentStatus.COMPLETED.equals(enrollment.getStatus()))
            .map(enrollment -> enrollment.getUser().getId())
            .distinct()
            .count();

    return InstructorAnalyticsFunnelResponse.Detail.builder()
        .steps(
            List.of(
                InstructorAnalyticsFunnelResponse.StepItem.builder()
                    .stepName("ENROLLED")
                    .value(enrolled)
                    .build(),
                InstructorAnalyticsFunnelResponse.StepItem.builder()
                    .stepName("STARTED")
                    .value(started)
                    .build(),
                InstructorAnalyticsFunnelResponse.StepItem.builder()
                    .stepName("PROGRESSED_50")
                    .value(progressed)
                    .build(),
                InstructorAnalyticsFunnelResponse.StepItem.builder()
                    .stepName("SUBMITTED_ASSIGNMENT")
                    .value(submitted)
                    .build(),
                InstructorAnalyticsFunnelResponse.StepItem.builder()
                    .stepName("COMPLETED")
                    .value(completed)
                    .build()))
        .build();
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

  private List<CourseEnrollment> loadEnrollments(Long instructorId) {
    return courseEnrollmentRepository.findAllByCourseInstructorIdOrderByEnrolledAtDesc(
        instructorId);
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

  private InstructorAnalyticsStudentResponse.StudentItem toStudentItem(
      CourseEnrollment enrollment) {
    return InstructorAnalyticsStudentResponse.StudentItem.builder()
        .studentId(enrollment.getUser().getId())
        .studentName(enrollment.getUser().getName())
        .courseId(enrollment.getCourse().getCourseId())
        .courseTitle(enrollment.getCourse().getTitle())
        .enrollmentStatus(enrollment.getStatus().name())
        .progressPercent(enrollment.getProgressPercentage())
        .completed(EnrollmentStatus.COMPLETED.equals(enrollment.getStatus()))
        .enrolledAt(enrollment.getEnrolledAt())
        .lastAccessedAt(enrollment.getLastAccessedAt())
        .completedAt(enrollment.getCompletedAt())
        .build();
  }

  private double averageInteger(Collection<Integer> values) {
    return metrics.averageIntegers(values, 2);
  }

  private double toPercent(long numerator, long denominator) {
    return metrics.percent(numerator, denominator, 2);
  }

  private LocalDateTime maxDateTime(Collection<LocalDateTime> values) {
    return values.stream()
        .filter(value -> value != null)
        .max(LocalDateTime::compareTo)
        .orElse(null);
  }
}
