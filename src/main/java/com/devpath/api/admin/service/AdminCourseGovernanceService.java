package com.devpath.api.admin.service;

import com.devpath.api.admin.dto.governance.CourseApproveRequest;
import com.devpath.api.admin.dto.governance.CourseRejectRequest;
import com.devpath.api.admin.dto.governance.CourseReviewDetailResponse;
import com.devpath.api.admin.dto.governance.CourseReviewHistoryResponse;
import com.devpath.api.admin.dto.governance.PendingCourseResponse;
import com.devpath.api.course.service.HlsPlaybackService;
import com.devpath.api.notification.service.InstructorNotificationService;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.admin.entity.CourseReviewHistory;
import com.devpath.domain.admin.repository.CourseReviewHistoryRepository;
import com.devpath.domain.course.entity.Course;
import com.devpath.domain.course.entity.CourseSection;
import com.devpath.domain.course.entity.CourseStatus;
import com.devpath.domain.course.entity.Lesson;
import com.devpath.domain.course.repository.CourseRepository;
import com.devpath.domain.course.repository.CourseSectionRepository;
import com.devpath.domain.course.repository.LessonRepository;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminCourseGovernanceService {

  private final CourseRepository courseRepository;
  private final CourseSectionRepository courseSectionRepository;
  private final LessonRepository lessonRepository;
  private final HlsPlaybackService hlsPlaybackService;
  private final InstructorNotificationService instructorNotificationService;
  private final CourseReviewHistoryRepository courseReviewHistoryRepository;

  public List<PendingCourseResponse> getPendingCourses() {
    return courseRepository.findByStatus(CourseStatus.IN_REVIEW).stream()
        .map(PendingCourseResponse::from)
        .collect(Collectors.toList());
  }

  public CourseReviewDetailResponse getCourseReview(Long courseId, Long adminId) {
    Course course =
        courseRepository
            .findById(courseId)
            .orElseThrow(() -> new CustomException(ErrorCode.COURSE_NOT_FOUND));
    if (course.getStatus() != CourseStatus.IN_REVIEW) {
      throw new CustomException(ErrorCode.INVALID_STATUS_TRANSITION);
    }

    List<CourseSection> sections =
        courseSectionRepository.findAllByCourseCourseIdOrderByOrderIndexAsc(courseId);
    List<Long> sectionIds = sections.stream().map(CourseSection::getSectionId).toList();
    List<Lesson> lessons =
        sectionIds.isEmpty()
            ? List.of()
            : lessonRepository.findAllBySectionIdsInDisplayOrder(sectionIds);
    Map<Long, List<Lesson>> lessonsBySectionId =
        lessons.stream()
            .collect(Collectors.groupingBy(lesson -> lesson.getSection().getSectionId()));
    List<CourseReviewHistoryResponse> reviewHistory =
        courseReviewHistoryRepository.findAllByCourseIdOrderByProcessedAtDesc(courseId).stream()
            .map(CourseReviewHistoryResponse::from)
            .toList();

    return CourseReviewDetailResponse.from(
        course,
        sections,
        lessonsBySectionId,
        reviewHistory,
        lesson -> hlsPlaybackService.issuePlaybackUrl(lesson, adminId));
  }

  @Transactional
  public void approveCourse(Long courseId, Long adminId, CourseApproveRequest request) {
    Course course =
        courseRepository
            .findById(courseId)
            .orElseThrow(() -> new CustomException(ErrorCode.COURSE_NOT_FOUND));
    if (course.getStatus() != CourseStatus.IN_REVIEW) {
      throw new CustomException(ErrorCode.INVALID_STATUS_TRANSITION);
    }
    course.approve();
    saveHistory(course, adminId, "APPROVED", request.getReason());
    instructorNotificationService.notifySystem(
        course.getInstructor().getId(),
        "강좌가 승인되었습니다: " + course.getTitle() + " / 사유: " + request.getReason());
  }

  @Transactional
  public void rejectCourse(Long courseId, Long adminId, CourseRejectRequest request) {
    Course course =
        courseRepository
            .findById(courseId)
            .orElseThrow(() -> new CustomException(ErrorCode.COURSE_NOT_FOUND));
    if (course.getStatus() != CourseStatus.IN_REVIEW) {
      throw new CustomException(ErrorCode.INVALID_STATUS_TRANSITION);
    }
    course.reject();
    saveHistory(course, adminId, "REJECTED", request.getReason());
    instructorNotificationService.notifySystem(
        course.getInstructor().getId(),
        "강좌가 반려되었습니다: " + course.getTitle() + " / 사유: " + request.getReason());
  }

  public List<CourseReviewHistoryResponse> getReviewHistory() {
    return courseReviewHistoryRepository.findAllByOrderByProcessedAtDesc().stream()
        .map(CourseReviewHistoryResponse::from)
        .toList();
  }

  private void saveHistory(Course course, Long adminId, String action, String reason) {
    courseReviewHistoryRepository.save(
        CourseReviewHistory.builder()
            .courseId(course.getCourseId())
            .instructorId(course.getInstructor().getId())
            .adminId(adminId)
            .action(action)
            .reason(reason)
            .build());
  }
}
