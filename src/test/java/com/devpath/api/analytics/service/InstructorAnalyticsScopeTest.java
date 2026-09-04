package com.devpath.api.analytics.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.devpath.common.exception.CustomException;
import com.devpath.domain.course.repository.CourseNodeMappingRepository;
import com.devpath.domain.course.repository.CourseRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class InstructorAnalyticsScopeTest {

  @Mock private UserRepository userRepository;
  @Mock private CourseRepository courseRepository;
  @Mock private CourseNodeMappingRepository courseNodeMappingRepository;
  @InjectMocks private InstructorAnalyticsScope scope;

  @Test
  void returnsEmptyNodeIdsWhenInstructorHasNoCourses() {
    when(userRepository.findById(7L)).thenReturn(Optional.of(mock(User.class)));
    when(courseRepository.findAllByInstructorIdOrderByCourseIdDesc(7L)).thenReturn(List.of());

    assertThat(scope.loadNodeIds(7L)).isEmpty();
  }

  @Test
  void rejectsMissingAuthenticatedInstructor() {
    assertThatThrownBy(() -> scope.loadNodeIds(null)).isInstanceOf(CustomException.class);
  }
}
