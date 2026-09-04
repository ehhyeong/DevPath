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
import com.devpath.domain.learning.repository.LessonProgressRepository;
import com.devpath.domain.learning.repository.QuizAttemptRepository;
import com.devpath.domain.learning.repository.SubmissionRepository;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
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
  private final InstructorCourseListQueryService instructorCourseListQueryService;
  private final InstructorLearningDashboardAssembler learningDashboardAssembler;
  private final InstructorAssessmentDashboardAssembler assessmentDashboardAssembler;

  public InstructorAnalyticsDashboardResponse getDashboard(Long instructorId, Long courseId) {
    List<InstructorCourseListResponse> courseOptions =
        instructorCourseListQueryService.getCourseList(instructorId);
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

    Set<Long> scopedCourseIds =
        scopedCourses.stream()
            .map(Course::getCourseId)
            .collect(Collectors.toCollection(LinkedHashSet::new));
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

    InstructorLearningDashboardAssembler.Sections learningSections =
        learningDashboardAssembler.assemble(scopedCourses, enrollments, lessons, progresses);

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
    InstructorAssessmentDashboardAssembler.Sections assessmentSections =
        assessmentDashboardAssembler.assemble(
            quizAttempts, submissions, learningSections.dropOffs());

    return new InstructorAnalyticsDashboardResponse(
        learningSections.overview(),
        courseOptions,
        learningSections.students(),
        learningSections.courseProgress(),
        learningSections.completionRates(),
        learningSections.averageWatchTimes(),
        learningSections.dropOffs(),
        assessmentSections.difficultyItems(),
        assessmentSections.quizStats(),
        assessmentSections.assignmentStats(),
        learningSections.funnel(),
        assessmentSections.weakPoints(),
        assessmentSections.aiInsights());
  }

  private boolean isCountableEnrollment(CourseEnrollment enrollment) {
    return enrollment.getStatus() == EnrollmentStatus.ACTIVE
        || enrollment.getStatus() == EnrollmentStatus.COMPLETED;
  }
}
