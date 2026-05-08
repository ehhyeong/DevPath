package com.devpath.api.instructor.service;

import com.devpath.api.instructor.dto.analytics.InstructorAnalyticsDashboardResponse;
import com.devpath.api.instructor.dto.course.InstructorCourseListResponse;
import com.devpath.domain.course.entity.Course;
import com.devpath.domain.course.entity.CourseEnrollment;
import com.devpath.domain.course.entity.CourseNodeMapping;
import com.devpath.domain.course.entity.EnrollmentStatus;
import com.devpath.domain.course.entity.Lesson;
import com.devpath.domain.course.repository.CourseEnrollmentRepository;
import com.devpath.domain.course.repository.CourseNodeMappingRepository;
import com.devpath.domain.course.repository.CourseRepository;
import com.devpath.domain.course.repository.LessonRepository;
import com.devpath.domain.learning.entity.LessonProgress;
import com.devpath.domain.learning.entity.QuizAttempt;
import com.devpath.domain.learning.entity.Submission;
import com.devpath.domain.learning.entity.SubmissionStatus;
import com.devpath.domain.learning.repository.LessonProgressRepository;
import com.devpath.domain.learning.repository.QuizAttemptRepository;
import com.devpath.domain.learning.repository.SubmissionRepository;
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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class InstructorAnalyticsService {

  private final CourseRepository courseRepository;
  private final CourseEnrollmentRepository courseEnrollmentRepository;
  private final LessonRepository lessonRepository;
  private final LessonProgressRepository lessonProgressRepository;
  private final CourseNodeMappingRepository courseNodeMappingRepository;
  private final QuizAttemptRepository quizAttemptRepository;
  private final SubmissionRepository submissionRepository;
  private final InstructorCourseQueryService instructorCourseQueryService;

  public InstructorAnalyticsDashboardResponse getDashboard(Long instructorId, Long courseId) {
    List<InstructorCourseListResponse> courseOptions =
        instructorCourseQueryService.getCourseList(instructorId);
    Set<Long> availableCourseIds =
        courseOptions.stream()
            .map(InstructorCourseListResponse::courseId)
            .collect(Collectors.toCollection(LinkedHashSet::new));
    Long selectedCourseId =
        courseId != null && availableCourseIds.contains(courseId) ? courseId : null;

    List<Course> scopedCourses =
        courseRepository.findAllByInstructorIdOrderByCourseIdDesc(instructorId).stream()
            .filter(course -> availableCourseIds.contains(course.getCourseId()))
            .filter(
                course -> selectedCourseId == null || course.getCourseId().equals(selectedCourseId))
            .toList();

    if (scopedCourses.isEmpty()) {
      return InstructorAnalyticsDashboardResponse.empty(courseOptions);
    }

    LinkedHashMap<Long, Course> coursesById =
        scopedCourses.stream()
            .collect(
                Collectors.toMap(
                    Course::getCourseId,
                    Function.identity(),
                    (left, right) -> left,
                    LinkedHashMap::new));
    Set<Long> scopedCourseIds = coursesById.keySet();

    List<CourseEnrollment> enrollments =
        courseEnrollmentRepository
            .findAllByCourseInstructorIdOrderByEnrolledAtDesc(instructorId)
            .stream()
            .filter(enrollment -> scopedCourseIds.contains(enrollment.getCourse().getCourseId()))
            .filter(this::isCountableEnrollment)
            .toList();
    List<Lesson> lessons =
        lessonRepository.findAllBySectionCourseInstructorIdAndIsPublishedTrue(instructorId).stream()
            .filter(
                lesson -> scopedCourseIds.contains(lesson.getSection().getCourse().getCourseId()))
            .toList();
    List<LessonProgress> progresses =
        lessonProgressRepository.findAllByInstructorId(instructorId).stream()
            .filter(
                progress ->
                    scopedCourseIds.contains(
                        progress.getLesson().getSection().getCourse().getCourseId()))
            .toList();

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

    List<InstructorAnalyticsDashboardResponse.DropOffItem> dropOffs =
        buildDropOffItems(lessons, progresses);

    List<CourseNodeMapping> nodeMappings =
        courseNodeMappingRepository.findAllByCourseCourseIdIn(scopedCourseIds);
    Set<Long> nodeIds =
        nodeMappings.stream()
            .map(mapping -> mapping.getNode().getNodeId())
            .collect(Collectors.toCollection(LinkedHashSet::new));
    List<QuizAttempt> quizAttempts =
        nodeIds.isEmpty()
            ? List.of()
            : quizAttemptRepository
                .findAllByQuizRoadmapNodeNodeIdInAndIsDeletedFalseOrderByCreatedAtDesc(nodeIds);
    List<Submission> submissions =
        nodeIds.isEmpty()
            ? List.of()
            : submissionRepository
                .findAllByAssignmentRoadmapNodeNodeIdInAndIsDeletedFalseOrderBySubmittedAtDesc(
                    nodeIds);

    return new InstructorAnalyticsDashboardResponse(
        buildOverview(scopedCourses, enrollments, lessons, progresses),
        courseOptions,
        buildStudents(enrollments, progressesByLearnerCourse),
        buildCourseProgressItems(coursesById, enrollmentsByCourse, progressesByCourse),
        buildCompletionRateItems(coursesById, enrollmentsByCourse),
        buildAverageWatchTimeItems(coursesById, progressesByCourse),
        dropOffs,
        buildDifficultyItems(quizAttempts, submissions, dropOffs),
        buildQuizStats(quizAttempts),
        buildAssignmentStats(submissions),
        buildFunnel(enrollments, progresses),
        buildWeakPoints(buildDifficultyItems(quizAttempts, submissions, dropOffs)));
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

  private boolean isCountableEnrollment(CourseEnrollment enrollment) {
    return enrollment.getStatus() == EnrollmentStatus.ACTIVE
        || enrollment.getStatus() == EnrollmentStatus.COMPLETED;
  }

  private boolean isEnrollmentCompleted(CourseEnrollment enrollment, Double progress) {
    return enrollment.getStatus() == EnrollmentStatus.COMPLETED
        || enrollment.getCompletedAt() != null
        || (progress != null && progress >= 100.0);
  }

  private boolean isSubmissionGraded(Submission submission) {
    return submission.getSubmissionStatus() == SubmissionStatus.GRADED
        || submission.getGradedAt() != null;
  }

  private boolean isSubmissionPassed(Submission submission) {
    return calculateAssignmentScoreRate(submission) >= 60.0;
  }

  private double calculateAssignmentScoreRate(Submission submission) {
    int maxScore = Math.max(defaultInt(submission.getAssignment().getTotalScore()), 1);
    return roundToOneDecimal((defaultInt(submission.getTotalScore()) * 100.0) / maxScore);
  }

  private double calculateScoreRate(QuizAttempt attempt) {
    int maxScore = Math.max(defaultInt(attempt.getMaxScore()), 1);
    return roundToOneDecimal((defaultInt(attempt.getScore()) * 100.0) / maxScore);
  }

  private double calculateRate(long denominator, long numerator) {
    if (denominator <= 0) {
      return 0.0;
    }
    return roundToOneDecimal((numerator * 100.0) / denominator);
  }

  private int defaultInt(Integer value) {
    return value == null ? 0 : value;
  }

  private double roundToOneDecimal(double value) {
    return Math.round(value * 10.0) / 10.0;
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
      return "Quiz and assignment results are both weak. Add reinforcement materials for this node.";
    }
    if (item.quizPassRate() < 60.0) {
      return "Quiz pass rate is low. Review explanations and extra examples are recommended.";
    }
    if (item.assignmentScoreRate() < 60.0) {
      return "Assignment scores are low. A guided practice task would help learners recover.";
    }
    return "Drop-off is high around this node. Breaking the content into smaller steps is recommended.";
  }
}
