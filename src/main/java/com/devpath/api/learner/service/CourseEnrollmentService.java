package com.devpath.api.learner.service;

import com.devpath.api.instructor.service.InstructorNotificationService;
import com.devpath.api.learner.dto.CourseEnrollmentDto;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.course.entity.Course;
import com.devpath.domain.course.entity.CourseEnrollment;
import com.devpath.domain.course.entity.EnrollmentStatus;
import com.devpath.domain.course.repository.CourseEnrollmentRepository;
import com.devpath.domain.course.repository.CourseRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CourseEnrollmentService {

  private final CourseEnrollmentRepository courseEnrollmentRepository;
  private final CourseRepository courseRepository;
  private final UserRepository userRepository;
  private final InstructorNotificationService instructorNotificationService;

  @Transactional
  public CourseEnrollment enroll(Long userId, Long courseId) {
    if (courseEnrollmentRepository.existsByUser_IdAndCourse_CourseId(userId, courseId)) {
      throw new CustomException(ErrorCode.ALREADY_EXISTS, "이미 수강 중인 강의입니다.");
    }

    User user =
        userRepository
            .findById(userId)
            .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
    Course course =
        courseRepository
            .findById(courseId)
            .orElseThrow(() -> new CustomException(ErrorCode.COURSE_NOT_FOUND));
    CourseEnrollment enrollment = CourseEnrollment.builder().user(user).course(course).build();

    CourseEnrollment saved = courseEnrollmentRepository.save(enrollment);
    instructorNotificationService.notifySystem(
        course.getInstructorId(), user.getName() + "님이 강좌에 수강 신청했습니다: " + course.getTitle());
    return saved;
  }

  @Transactional
  public CourseEnrollmentDto.EnrollResponse enrollCourse(Long userId, Long courseId) {
    return CourseEnrollmentDto.EnrollResponse.from(enroll(userId, courseId));
  }

  public List<CourseEnrollment> getMyEnrollments(Long userId) {
    return courseEnrollmentRepository.findAllByUserIdWithCourse(userId);
  }

  public List<CourseEnrollmentDto.EnrollmentResponse> getMyEnrollmentResponses(Long userId) {
    return getMyEnrollments(userId).stream()
        .map(CourseEnrollmentDto.EnrollmentResponse::from)
        .toList();
  }

  public List<CourseEnrollment> getMyEnrollmentsByStatus(Long userId, EnrollmentStatus status) {
    return courseEnrollmentRepository.findAllByUserIdAndStatusWithCourse(userId, status);
  }

  public List<CourseEnrollmentDto.EnrollmentResponse> getMyEnrollmentResponsesByStatus(
      Long userId, EnrollmentStatus status) {
    return getMyEnrollmentsByStatus(userId, status).stream()
        .map(CourseEnrollmentDto.EnrollmentResponse::from)
        .toList();
  }

  public boolean isEnrolled(Long userId, Long courseId) {
    return courseEnrollmentRepository.existsByUser_IdAndCourse_CourseId(userId, courseId);
  }

  public Set<Long> getEnrolledCourseIds(Long userId, Collection<Long> courseIds) {
    if (userId == null || courseIds == null || courseIds.isEmpty()) {
      return Set.of();
    }

    return new HashSet<>(
        courseEnrollmentRepository.findCourseIdsByUserIdAndCourseIds(userId, courseIds));
  }

  @Transactional
  public void updateProgress(Long userId, Long courseId, Integer progressPercentage) {
    CourseEnrollment enrollment =
        courseEnrollmentRepository
            .findByUser_IdAndCourse_CourseId(userId, courseId)
            .orElseThrow(() -> new CustomException(ErrorCode.ENROLLMENT_NOT_FOUND));

    enrollment.updateProgress(progressPercentage);
  }

  @Transactional
  public void updateLastAccessed(Long userId, Long courseId) {
    CourseEnrollment enrollment =
        courseEnrollmentRepository
            .findByUser_IdAndCourse_CourseId(userId, courseId)
            .orElseThrow(() -> new CustomException(ErrorCode.ENROLLMENT_NOT_FOUND));

    enrollment.updateLastAccessed();
  }
}
