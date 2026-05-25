package com.devpath.api.admin.service;

import com.devpath.api.admin.dto.governance.CourseApproveRequest;
import com.devpath.api.admin.dto.governance.CourseRejectRequest;
import com.devpath.api.admin.dto.governance.PendingCourseResponse;
import com.devpath.api.instructor.service.InstructorNotificationService;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.course.entity.Course;
import com.devpath.domain.course.entity.CourseStatus;
import com.devpath.domain.course.repository.CourseRepository;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminCourseGovernanceService {

  private final CourseRepository courseRepository;
  private final InstructorNotificationService instructorNotificationService;

  public List<PendingCourseResponse> getPendingCourses() {
    return courseRepository.findByStatus(CourseStatus.IN_REVIEW).stream()
        .map(PendingCourseResponse::from)
        .collect(Collectors.toList());
  }

  @Transactional
  public void approveCourse(Long courseId, CourseApproveRequest request) {
    Course course =
        courseRepository
            .findById(courseId)
            .orElseThrow(() -> new CustomException(ErrorCode.COURSE_NOT_FOUND));
    if (course.getStatus() != CourseStatus.IN_REVIEW) {
      throw new CustomException(ErrorCode.INVALID_STATUS_TRANSITION);
    }
    course.approve();
    instructorNotificationService.notifySystem(
        course.getInstructorId(), "강좌가 승인되었습니다: " + course.getTitle());
  }

  @Transactional
  public void rejectCourse(Long courseId, CourseRejectRequest request) {
    Course course =
        courseRepository
            .findById(courseId)
            .orElseThrow(() -> new CustomException(ErrorCode.COURSE_NOT_FOUND));
    if (course.getStatus() != CourseStatus.IN_REVIEW) {
      throw new CustomException(ErrorCode.INVALID_STATUS_TRANSITION);
    }
    course.reject();
    instructorNotificationService.notifySystem(
        course.getInstructorId(), "강좌가 반려되었습니다: " + course.getTitle());
  }
}
