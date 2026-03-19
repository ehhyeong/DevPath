package com.devpath.api.course.service;

import com.devpath.api.course.dto.PublicCourseNewsDto;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.course.entity.Course;
import com.devpath.domain.course.entity.CourseAnnouncement;
import com.devpath.domain.course.entity.CourseStatus;
import com.devpath.domain.course.repository.CourseAnnouncementRepository;
import com.devpath.domain.course.repository.CourseRepository;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// 공개 강의 새소식 탭 조회 로직을 처리한다.
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PublicCourseNewsQueryService {

    private final CourseRepository courseRepository;
    private final CourseAnnouncementRepository courseAnnouncementRepository;

    // 공개 강의의 새소식 탭 목록을 조회한다.
    public List<PublicCourseNewsDto.NewsItemResponse> getCourseNews(Long courseId) {
        validatePublishedCourse(courseId);

        LocalDateTime now = LocalDateTime.now();

        List<CourseAnnouncement> announcements =
                courseAnnouncementRepository.findPublicNewsTabAnnouncements(
                        courseId,
                        CourseStatus.PUBLISHED,
                        now
                );

        return announcements.stream()
                .map(this::toNewsItemResponse)
                .toList();
    }

    // 공개 상태의 강의인지 검증한다.
    private void validatePublishedCourse(Long courseId) {
        Course course = courseRepository.findByCourseIdAndStatus(courseId, CourseStatus.PUBLISHED)
                .orElseThrow(() -> new CustomException(ErrorCode.RESOURCE_NOT_FOUND));

        if (course.getCourseId() == null) {
            throw new CustomException(ErrorCode.RESOURCE_NOT_FOUND);
        }
    }

    // 공지 엔티티를 새소식 탭 응답 DTO로 변환한다.
    private PublicCourseNewsDto.NewsItemResponse toNewsItemResponse(CourseAnnouncement announcement) {
        return PublicCourseNewsDto.NewsItemResponse.builder()
                .announcementId(announcement.getAnnouncementId())
                .type(announcement.getType().name())
                .title(announcement.getTitle())
                .content(announcement.getContent())
                .pinned(announcement.getPinned())
                .displayOrder(announcement.getDisplayOrder())
                .publishedAt(announcement.getPublishedAt())
                .exposureStartAt(announcement.getExposureStartAt())
                .exposureEndAt(announcement.getExposureEndAt())
                .eventBannerText(announcement.getEventBannerText())
                .eventLink(announcement.getEventLink())
                .createdAt(announcement.getCreatedAt())
                .build();
    }
}
