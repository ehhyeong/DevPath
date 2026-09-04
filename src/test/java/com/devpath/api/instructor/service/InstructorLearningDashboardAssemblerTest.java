package com.devpath.api.instructor.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.devpath.domain.analytics.service.InstructorAnalyticsMetrics;
import com.devpath.domain.course.entity.Course;
import com.devpath.domain.course.entity.CourseEnrollment;
import com.devpath.domain.course.entity.CourseSection;
import com.devpath.domain.course.entity.EnrollmentStatus;
import com.devpath.domain.course.entity.Lesson;
import com.devpath.domain.learning.entity.LessonProgress;
import com.devpath.domain.user.entity.User;
import java.util.List;
import org.junit.jupiter.api.Test;

class InstructorLearningDashboardAssemblerTest {

  private final InstructorLearningDashboardAssembler assembler =
      new InstructorLearningDashboardAssembler(new InstructorAnalyticsMetrics());

  @Test
  void assemblesCompletionDropOffAndFunnelFromLearningActivity() {
    Course course = mock(Course.class);
    CourseSection section = mock(CourseSection.class);
    CourseEnrollment enrollment = mock(CourseEnrollment.class);
    Lesson lesson = mock(Lesson.class);
    LessonProgress progress = mock(LessonProgress.class);
    User learner = mock(User.class);

    when(course.getCourseId()).thenReturn(11L);
    when(course.getTitle()).thenReturn("Spring Boot");
    when(section.getCourse()).thenReturn(course);
    when(lesson.getLessonId()).thenReturn(21L);
    when(lesson.getTitle()).thenReturn("Security");
    when(lesson.getSection()).thenReturn(section);
    when(learner.getId()).thenReturn(31L);
    when(learner.getName()).thenReturn("Learner");
    when(enrollment.getCourse()).thenReturn(course);
    when(enrollment.getUser()).thenReturn(learner);
    when(enrollment.getStatus()).thenReturn(EnrollmentStatus.COMPLETED);
    when(enrollment.getProgressPercentage()).thenReturn(100);
    when(progress.getLesson()).thenReturn(lesson);
    when(progress.getUser()).thenReturn(learner);
    when(progress.getIsCompleted()).thenReturn(false);
    when(progress.getProgressSeconds()).thenReturn(120);

    var sections =
        assembler.assemble(
            List.of(course), List.of(enrollment), List.of(lesson), List.of(progress));

    assertThat(sections.overview().courseCount()).isEqualTo(1);
    assertThat(sections.overview().averageProgressPercent()).isEqualTo(100.0);
    assertThat(sections.completionRates().get(0).completionRate()).isEqualTo(100.0);
    assertThat(sections.dropOffs().get(0).dropOffRate()).isEqualTo(100.0);
    assertThat(sections.dropOffs().get(0).averageWatchSeconds()).isEqualTo(120.0);
    assertThat(sections.funnel().steps())
        .extracting(step -> step.stepName() + "=" + step.value())
        .containsExactly("Enrolled=1", "Started=1", "Halfway=1", "Completed=1");
  }
}
