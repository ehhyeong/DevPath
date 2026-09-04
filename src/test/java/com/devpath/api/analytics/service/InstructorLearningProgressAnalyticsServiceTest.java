package com.devpath.api.analytics.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.devpath.domain.analytics.service.InstructorAnalyticsMetrics;
import com.devpath.domain.course.entity.Course;
import com.devpath.domain.course.entity.CourseEnrollment;
import com.devpath.domain.course.entity.EnrollmentStatus;
import com.devpath.domain.course.repository.CourseEnrollmentRepository;
import com.devpath.domain.course.repository.CourseNodeMappingRepository;
import com.devpath.domain.course.repository.CourseRepository;
import com.devpath.domain.course.repository.LessonRepository;
import com.devpath.domain.learning.repository.LessonProgressRepository;
import com.devpath.domain.learning.repository.SubmissionRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class InstructorLearningProgressAnalyticsServiceTest {

  @Mock private UserRepository userRepository;
  @Mock private CourseRepository courseRepository;
  @Mock private CourseEnrollmentRepository courseEnrollmentRepository;
  @Mock private CourseNodeMappingRepository courseNodeMappingRepository;
  @Mock private LessonRepository lessonRepository;
  @Mock private LessonProgressRepository lessonProgressRepository;
  @Mock private SubmissionRepository submissionRepository;
  @Spy private InstructorAnalyticsMetrics metrics = new InstructorAnalyticsMetrics();
  @InjectMocks private InstructorLearningProgressAnalyticsService service;

  @Test
  void calculatesCompletionRateForEachCourse() {
    Long instructorId = 7L;
    Course course = mock(Course.class);
    CourseEnrollment completedEnrollment = mock(CourseEnrollment.class);
    CourseEnrollment activeEnrollment = mock(CourseEnrollment.class);

    when(userRepository.findById(instructorId)).thenReturn(Optional.of(mock(User.class)));
    when(courseRepository.findAllByInstructorIdOrderByCourseIdDesc(instructorId))
        .thenReturn(List.of(course));
    when(courseEnrollmentRepository.findAllByCourseInstructorIdOrderByEnrolledAtDesc(instructorId))
        .thenReturn(List.of(completedEnrollment, activeEnrollment));
    when(course.getCourseId()).thenReturn(11L);
    when(course.getTitle()).thenReturn("Spring Boot");
    when(completedEnrollment.getCourse()).thenReturn(course);
    when(completedEnrollment.getStatus()).thenReturn(EnrollmentStatus.COMPLETED);
    when(activeEnrollment.getCourse()).thenReturn(course);
    when(activeEnrollment.getStatus()).thenReturn(EnrollmentStatus.ACTIVE);

    var result = service.getCompletionRate(instructorId);

    assertThat(result).hasSize(1);
    assertThat(result.get(0).getCourseId()).isEqualTo(11L);
    assertThat(result.get(0).getEnrolledStudentCount()).isEqualTo(2L);
    assertThat(result.get(0).getCompletedStudentCount()).isEqualTo(1L);
    assertThat(result.get(0).getCompletionRate()).isEqualTo(50.0);
  }
}
