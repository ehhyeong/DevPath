package com.devpath.api.analytics.service;

import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.course.entity.Course;
import com.devpath.domain.course.entity.CourseNodeMapping;
import com.devpath.domain.course.repository.CourseNodeMappingRepository;
import com.devpath.domain.course.repository.CourseRepository;
import com.devpath.domain.user.repository.UserRepository;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
class InstructorAnalyticsScope {

  private final UserRepository userRepository;
  private final CourseRepository courseRepository;
  private final CourseNodeMappingRepository courseNodeMappingRepository;

  Set<Long> loadNodeIds(Long instructorId) {
    return loadCourseNodeMappings(instructorId).stream()
        .map(mapping -> mapping.getNode().getNodeId())
        .collect(Collectors.toCollection(LinkedHashSet::new));
  }

  List<CourseNodeMapping> loadCourseNodeMappings(Long instructorId) {
    validateInstructor(instructorId);
    List<Long> courseIds =
        courseRepository.findAllByInstructorIdOrderByCourseIdDesc(instructorId).stream()
            .map(Course::getCourseId)
            .toList();
    if (courseIds.isEmpty()) {
      return List.of();
    }
    return courseNodeMappingRepository.findAllByCourseCourseIdIn(courseIds);
  }

  private void validateInstructor(Long instructorId) {
    if (instructorId == null) {
      throw new CustomException(ErrorCode.UNAUTHORIZED);
    }
    userRepository
        .findById(instructorId)
        .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
  }
}
