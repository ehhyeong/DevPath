package com.devpath.api.instructor.service;

import com.devpath.api.instructor.dto.InstructorAnnouncementDto;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.course.entity.Course;
import com.devpath.domain.course.entity.CourseAnnouncement;
import com.devpath.domain.course.repository.CourseAnnouncementRepository;
import com.devpath.domain.course.repository.CourseRepository;
import com.devpath.domain.user.repository.UserRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// 강사용 공지/새소식 읽기 로직을 처리한다.
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class InstructorAnnouncementQueryService {

  private final UserRepository userRepository;
  private final CourseRepository courseRepository;
  private final CourseAnnouncementRepository courseAnnouncementRepository;

  // 특정 강의의 공지 목록을 조회한다.
  public List<InstructorAnnouncementDto.AnnouncementSummaryResponse> getAnnouncements(
      Long instructorId, Long courseId) {
    validateAuthenticatedUser(instructorId);
    getOwnedCourse(instructorId, courseId);

    List<CourseAnnouncement> announcements =
        courseAnnouncementRepository
            .findAllByCourseCourseIdOrderByPinnedDescDisplayOrderAscAnnouncementIdDesc(courseId);

    return announcements.stream().map(this::toSummaryResponse).toList();
  }

  // 특정 공지의 상세 정보를 조회한다.
  public InstructorAnnouncementDto.AnnouncementDetailResponse getAnnouncementDetail(
      Long instructorId, Long announcementId) {
    validateAuthenticatedUser(instructorId);

    CourseAnnouncement courseAnnouncement = getOwnedAnnouncement(instructorId, announcementId);
    return toDetailResponse(courseAnnouncement);
  }

  // 현재 로그인한 사용자가 존재하는지 검증한다.
  private void validateAuthenticatedUser(Long instructorId) {
    if (instructorId == null) {
      throw new CustomException(ErrorCode.UNAUTHORIZED);
    }

    if (!userRepository.existsById(instructorId)) {
      throw new CustomException(ErrorCode.USER_NOT_FOUND);
    }
  }

  // 현재 로그인한 강사가 소유한 강의인지 검증하며 조회한다.
  private Course getOwnedCourse(Long instructorId, Long courseId) {
    return courseRepository
        .findByCourseIdAndInstructorId(courseId, instructorId)
        .orElseGet(
            () -> {
              if (courseRepository.existsById(courseId)) {
                throw new CustomException(ErrorCode.FORBIDDEN);
              }
              throw new CustomException(ErrorCode.RESOURCE_NOT_FOUND);
            });
  }

  // 현재 로그인한 강사가 소유한 공지인지 검증하며 조회한다.
  private CourseAnnouncement getOwnedAnnouncement(Long instructorId, Long announcementId) {
    return courseAnnouncementRepository
        .findByAnnouncementIdAndCourseInstructorId(announcementId, instructorId)
        .orElseGet(
            () -> {
              if (courseAnnouncementRepository.existsById(announcementId)) {
                throw new CustomException(ErrorCode.FORBIDDEN);
              }
              throw new CustomException(ErrorCode.RESOURCE_NOT_FOUND);
            });
  }

  // 엔티티를 공지 목록 응답 DTO로 변환한다.
  private InstructorAnnouncementDto.AnnouncementSummaryResponse toSummaryResponse(
      CourseAnnouncement courseAnnouncement) {
    return InstructorAnnouncementDto.AnnouncementSummaryResponse.builder()
        .announcementId(courseAnnouncement.getAnnouncementId())
        .courseId(courseAnnouncement.getCourse().getCourseId())
        .type(courseAnnouncement.getType().name())
        .title(courseAnnouncement.getTitle())
        .pinned(courseAnnouncement.getPinned())
        .displayOrder(courseAnnouncement.getDisplayOrder())
        .publishedAt(courseAnnouncement.getPublishedAt())
        .exposureStartAt(courseAnnouncement.getExposureStartAt())
        .exposureEndAt(courseAnnouncement.getExposureEndAt())
        .eventBannerText(courseAnnouncement.getEventBannerText())
        .eventLink(courseAnnouncement.getEventLink())
        .build();
  }

  // 엔티티를 공지 상세 응답 DTO로 변환한다.
  private InstructorAnnouncementDto.AnnouncementDetailResponse toDetailResponse(
      CourseAnnouncement courseAnnouncement) {
    return InstructorAnnouncementDto.AnnouncementDetailResponse.builder()
        .announcementId(courseAnnouncement.getAnnouncementId())
        .courseId(courseAnnouncement.getCourse().getCourseId())
        .type(courseAnnouncement.getType().name())
        .title(courseAnnouncement.getTitle())
        .content(courseAnnouncement.getContent())
        .pinned(courseAnnouncement.getPinned())
        .displayOrder(courseAnnouncement.getDisplayOrder())
        .publishedAt(courseAnnouncement.getPublishedAt())
        .exposureStartAt(courseAnnouncement.getExposureStartAt())
        .exposureEndAt(courseAnnouncement.getExposureEndAt())
        .eventBannerText(courseAnnouncement.getEventBannerText())
        .eventLink(courseAnnouncement.getEventLink())
        .createdAt(courseAnnouncement.getCreatedAt())
        .updatedAt(courseAnnouncement.getUpdatedAt())
        .build();
  }
}
