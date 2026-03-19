package com.devpath.api.instructor.service;

import com.devpath.api.instructor.dto.InstructorAnnouncementDto;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.course.entity.Course;
import com.devpath.domain.course.entity.CourseAnnouncement;
import com.devpath.domain.course.entity.CourseAnnouncementType;
import com.devpath.domain.course.repository.CourseAnnouncementRepository;
import com.devpath.domain.course.repository.CourseRepository;
import com.devpath.domain.user.repository.UserRepository;
import java.net.URI;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// 강사용 공지/새소식 쓰기 로직을 처리한다.
@Service
@RequiredArgsConstructor
public class InstructorAnnouncementService {

    private final UserRepository userRepository;
    private final CourseRepository courseRepository;
    private final CourseAnnouncementRepository courseAnnouncementRepository;

    // 강의 공지를 생성한다.
    @Transactional
    public Long createAnnouncement(
            Long instructorId,
            Long courseId,
            InstructorAnnouncementDto.CreateAnnouncementRequest request
    ) {
        validateAuthenticatedUser(instructorId);

        Course course = getOwnedCourse(instructorId, courseId);
        CourseAnnouncementType announcementType = toAnnouncementType(request.getType());

        validateExposurePeriod(request.getExposureStartAt(), request.getExposureEndAt());
        validateEventFields(
                announcementType,
                request.getExposureStartAt(),
                request.getExposureEndAt(),
                request.getEventBannerText(),
                request.getEventLink()
        );

        CourseAnnouncement courseAnnouncement = CourseAnnouncement.builder()
                .course(course)
                .type(announcementType)
                .title(request.getTitle())
                .content(request.getContent())
                .pinned(request.getPinned())
                .displayOrder(request.getDisplayOrder())
                .publishedAt(request.getPublishedAt())
                .exposureStartAt(request.getExposureStartAt())
                .exposureEndAt(request.getExposureEndAt())
                .eventBannerText(normalizeBlank(request.getEventBannerText()))
                .eventLink(normalizeBlank(request.getEventLink()))
                .build();

        CourseAnnouncement savedAnnouncement = courseAnnouncementRepository.save(courseAnnouncement);
        return savedAnnouncement.getAnnouncementId();
    }

    // 강의 공지를 수정한다.
    @Transactional
    public void updateAnnouncement(
            Long instructorId,
            Long announcementId,
            InstructorAnnouncementDto.UpdateAnnouncementRequest request
    ) {
        validateAuthenticatedUser(instructorId);

        CourseAnnouncement courseAnnouncement = getOwnedAnnouncement(instructorId, announcementId);
        CourseAnnouncementType announcementType = toAnnouncementType(request.getType());

        validateExposurePeriod(request.getExposureStartAt(), request.getExposureEndAt());
        validateEventFields(
                announcementType,
                request.getExposureStartAt(),
                request.getExposureEndAt(),
                request.getEventBannerText(),
                request.getEventLink()
        );

        courseAnnouncement.update(
                announcementType,
                request.getTitle(),
                request.getContent(),
                request.getPinned(),
                request.getDisplayOrder(),
                request.getPublishedAt(),
                request.getExposureStartAt(),
                request.getExposureEndAt(),
                normalizeBlank(request.getEventBannerText()),
                normalizeBlank(request.getEventLink())
        );
    }

    // 강의 공지를 삭제한다.
    @Transactional
    public void deleteAnnouncement(Long instructorId, Long announcementId) {
        validateAuthenticatedUser(instructorId);

        CourseAnnouncement courseAnnouncement = getOwnedAnnouncement(instructorId, announcementId);
        courseAnnouncementRepository.delete(courseAnnouncement);
    }

    // 특정 공지의 고정 여부를 변경한다.
    @Transactional
    public void updateAnnouncementPin(
            Long instructorId,
            Long courseId,
            Long announcementId,
            InstructorAnnouncementDto.UpdateAnnouncementPinRequest request
    ) {
        validateAuthenticatedUser(instructorId);
        getOwnedCourse(instructorId, courseId);

        CourseAnnouncement courseAnnouncement =
                getOwnedAnnouncementInCourse(instructorId, courseId, announcementId);

        courseAnnouncement.changePinned(request.getPinned());
    }

    // 특정 강의의 공지 노출 순서를 일괄 변경한다.
    @Transactional
    public void updateAnnouncementDisplayOrder(
            Long instructorId,
            Long courseId,
            InstructorAnnouncementDto.UpdateAnnouncementOrderRequest request
    ) {
        validateAuthenticatedUser(instructorId);
        getOwnedCourse(instructorId, courseId);

        validateAnnouncementOrderItems(request.getAnnouncementOrders());

        List<Long> announcementIds = request.getAnnouncementOrders().stream()
                .map(InstructorAnnouncementDto.AnnouncementOrderItem::getAnnouncementId)
                .toList();

        List<CourseAnnouncement> announcements =
                courseAnnouncementRepository.findAllByAnnouncementIdInAndCourseCourseIdAndCourseInstructorId(
                        announcementIds,
                        courseId,
                        instructorId
                );

        if (announcements.size() != announcementIds.size()) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }

        Map<Long, CourseAnnouncement> announcementMap = new LinkedHashMap<>();
        for (CourseAnnouncement announcement : announcements) {
            announcementMap.put(announcement.getAnnouncementId(), announcement);
        }

        for (InstructorAnnouncementDto.AnnouncementOrderItem item : request.getAnnouncementOrders()) {
            CourseAnnouncement announcement = announcementMap.get(item.getAnnouncementId());

            if (announcement == null) {
                throw new CustomException(ErrorCode.INVALID_INPUT);
            }

            announcement.changeDisplayOrder(item.getDisplayOrder());
        }
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
        return courseRepository.findByCourseIdAndInstructorId(courseId, instructorId)
                .orElseGet(() -> {
                    if (courseRepository.existsById(courseId)) {
                        throw new CustomException(ErrorCode.FORBIDDEN);
                    }
                    throw new CustomException(ErrorCode.RESOURCE_NOT_FOUND);
                });
    }

    // 현재 로그인한 강사가 소유한 공지인지 검증하며 조회한다.
    private CourseAnnouncement getOwnedAnnouncement(Long instructorId, Long announcementId) {
        return courseAnnouncementRepository.findByAnnouncementIdAndCourseInstructorId(announcementId, instructorId)
                .orElseGet(() -> {
                    if (courseAnnouncementRepository.existsById(announcementId)) {
                        throw new CustomException(ErrorCode.FORBIDDEN);
                    }
                    throw new CustomException(ErrorCode.RESOURCE_NOT_FOUND);
                });
    }

    // 현재 로그인한 강사가 소유한 특정 강의의 공지인지 검증하며 조회한다.
    private CourseAnnouncement getOwnedAnnouncementInCourse(
            Long instructorId,
            Long courseId,
            Long announcementId
    ) {
        return courseAnnouncementRepository.findByAnnouncementIdAndCourseCourseIdAndCourseInstructorId(
                        announcementId,
                        courseId,
                        instructorId
                )
                .orElseThrow(() -> new CustomException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    // 노출 기간의 시작/종료 시각이 올바른지 검증한다.
    private void validateExposurePeriod(LocalDateTime exposureStartAt, LocalDateTime exposureEndAt) {
        if (exposureStartAt != null && exposureEndAt != null && exposureStartAt.isAfter(exposureEndAt)) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
    }

    // 이벤트 공지 필수값과 일반 공지 허용값을 검증한다.
    private void validateEventFields(
            CourseAnnouncementType type,
            LocalDateTime exposureStartAt,
            LocalDateTime exposureEndAt,
            String eventBannerText,
            String eventLink
    ) {
        if (type == CourseAnnouncementType.EVENT) {
            if (isBlank(eventBannerText) || isBlank(eventLink)) {
                throw new CustomException(ErrorCode.INVALID_INPUT);
            }

            if (exposureStartAt == null || exposureEndAt == null) {
                throw new CustomException(ErrorCode.INVALID_INPUT);
            }

            validateHttpUrl(eventLink);
            return;
        }

        if (!isBlank(eventBannerText) || !isBlank(eventLink)) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
    }

    // 공지 순서 변경 요청이 유효한지 검증한다.
    private void validateAnnouncementOrderItems(
            List<InstructorAnnouncementDto.AnnouncementOrderItem> announcementOrders
    ) {
        LinkedHashSet<Long> uniqueAnnouncementIds = new LinkedHashSet<>();
        LinkedHashSet<Integer> uniqueDisplayOrders = new LinkedHashSet<>();

        for (InstructorAnnouncementDto.AnnouncementOrderItem item : announcementOrders) {
            uniqueAnnouncementIds.add(item.getAnnouncementId());
            uniqueDisplayOrders.add(item.getDisplayOrder());
        }

        if (uniqueAnnouncementIds.size() != announcementOrders.size()) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }

        if (uniqueDisplayOrders.size() != announcementOrders.size()) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
    }

    // 이벤트 링크가 http 또는 https URL인지 검증한다.
    private void validateHttpUrl(String value) {
        try {
            URI uri = URI.create(value);

            if (uri.getScheme() == null || uri.getHost() == null) {
                throw new CustomException(ErrorCode.INVALID_INPUT);
            }

            String scheme = uri.getScheme().toLowerCase(Locale.ROOT);

            if (!scheme.equals("http") && !scheme.equals("https")) {
                throw new CustomException(ErrorCode.INVALID_INPUT);
            }
        } catch (IllegalArgumentException e) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
    }

    // 문자열 공지 타입을 enum으로 변환한다.
    private CourseAnnouncementType toAnnouncementType(String type) {
        try {
            return CourseAnnouncementType.valueOf(type.trim().toUpperCase(Locale.ROOT));
        } catch (Exception e) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
    }

    // 비어 있는 문자열은 null로 정규화한다.
    private String normalizeBlank(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        return value.trim();
    }

    // 문자열이 비어 있는지 확인한다.
    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
