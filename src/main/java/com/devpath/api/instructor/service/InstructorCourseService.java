package com.devpath.api.instructor.service;

import com.devpath.api.instructor.dto.InstructorCourseDto;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.course.entity.Course;
import com.devpath.domain.course.entity.CourseDifficultyLevel;
import com.devpath.domain.course.entity.CourseStatus;
import com.devpath.domain.course.entity.CourseTagMap;
import com.devpath.domain.course.repository.CourseMaterialRepository;
import com.devpath.domain.course.repository.CourseObjectiveRepository;
import com.devpath.domain.course.repository.CourseRepository;
import com.devpath.domain.course.repository.CourseSectionRepository;
import com.devpath.domain.course.repository.CourseTagMapRepository;
import com.devpath.domain.course.repository.CourseTargetAudienceRepository;
import com.devpath.domain.course.repository.LessonRepository;
import com.devpath.domain.user.entity.Tag;
import com.devpath.domain.user.repository.TagRepository;
import com.devpath.domain.user.repository.UserRepository;
import java.util.List;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// 강사용 강의 CRUD와 상태 변경 비즈니스 로직을 처리한다.
@Service
@RequiredArgsConstructor
public class InstructorCourseService {

    private final UserRepository userRepository;
    private final TagRepository tagRepository;

    private final CourseRepository courseRepository;
    private final CourseSectionRepository courseSectionRepository;
    private final LessonRepository lessonRepository;
    private final CourseMaterialRepository courseMaterialRepository;
    private final CourseObjectiveRepository courseObjectiveRepository;
    private final CourseTargetAudienceRepository courseTargetAudienceRepository;
    private final CourseTagMapRepository courseTagMapRepository;

    // 현재 로그인한 강사 기준으로 강의를 생성한다.
    @Transactional
    public Long createCourse(Long instructorId, InstructorCourseDto.CreateCourseRequest request) {
        validateAuthenticatedUser(instructorId);

        Course course =
                Course.builder()
                        .instructorId(instructorId)
                        .title(request.getTitle())
                        .subtitle(request.getSubtitle())
                        .description(request.getDescription())
                        .price(request.getPrice())
                        .originalPrice(request.getOriginalPrice())
                        .currency(request.getCurrency())
                        .difficultyLevel(toDifficultyLevel(request.getDifficultyLevel()))
                        .status(CourseStatus.DRAFT)
                        .language(request.getLanguage())
                        .hasCertificate(request.getHasCertificate())
                        .build();

        Course savedCourse = courseRepository.save(course);
        replaceCourseTags(savedCourse, request.getTagIds());

        return savedCourse.getCourseId();
    }

    // 현재 로그인한 강사가 자신의 강의 기본 정보를 수정한다.
    @Transactional
    public void updateCourse(
            Long instructorId, Long courseId, InstructorCourseDto.UpdateCourseRequest request) {
        validateAuthenticatedUser(instructorId);

        Course course = getOwnedCourse(instructorId, courseId);

        course.updateBasicInfo(
                request.getTitle(),
                request.getSubtitle(),
                request.getDescription(),
                request.getPrice(),
                request.getOriginalPrice(),
                request.getCurrency(),
                toDifficultyLevel(request.getDifficultyLevel()),
                request.getLanguage(),
                request.getHasCertificate());
    }

    // 현재 로그인한 강사가 자신의 강의 상태를 변경한다.
    @Transactional
    public void updateCourseStatus(
            Long instructorId, Long courseId, InstructorCourseDto.UpdateStatusRequest request) {
        validateAuthenticatedUser(instructorId);

        Course course = getOwnedCourse(instructorId, courseId);
        course.changeStatus(toCourseStatus(request.getStatus()));
    }

    // 현재 로그인한 강사가 자신의 강의를 삭제한다.
    @Transactional
    public void deleteCourse(Long instructorId, Long courseId) {
        validateAuthenticatedUser(instructorId);

        Course course = getOwnedCourse(instructorId, courseId);
        deleteCourseChildren(courseId);
        courseRepository.delete(course);
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

    // 현재 로그인한 강사가 자신의 강의만 수정할 수 있도록 검증한다.
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

    // 강의 생성 시 선택한 태그를 강의-태그 매핑으로 저장한다.
    private void replaceCourseTags(Course course, List<Long> tagIds) {
        List<Tag> tags = tagRepository.findAllById(tagIds);

        if (tags.size() != tagIds.size()) {
            throw new CustomException(ErrorCode.TAG_NOT_FOUND);
        }

        courseTagMapRepository.deleteAllByCourseCourseId(course.getCourseId());

        List<CourseTagMap> mappings =
                tags.stream()
                        .map(
                                tag ->
                                        CourseTagMap.builder()
                                                .course(course)
                                                .tag(tag)
                                                .proficiencyLevel(3)
                                                .build())
                        .toList();

        courseTagMapRepository.saveAll(mappings);
    }

    // 강의 삭제 전 하위 엔티티를 순서대로 정리한다.
    private void deleteCourseChildren(Long courseId) {
        courseMaterialRepository.deleteAllByLessonSectionCourseCourseId(courseId);
        lessonRepository.deleteAllBySectionCourseCourseId(courseId);
        courseSectionRepository.deleteAllByCourseCourseId(courseId);
        courseObjectiveRepository.deleteAllByCourseCourseId(courseId);
        courseTargetAudienceRepository.deleteAllByCourseCourseId(courseId);
        courseTagMapRepository.deleteAllByCourseCourseId(courseId);
    }

    // 문자열 상태값을 강의 상태 enum으로 변환한다.
    private CourseStatus toCourseStatus(String status) {
        try {
            return CourseStatus.valueOf(status.toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new CustomException(ErrorCode.INVALID_COURSE_STATUS);
        }
    }

    // 문자열 난이도값을 강의 난이도 enum으로 변환한다.
    private CourseDifficultyLevel toDifficultyLevel(String difficultyLevel) {
        if (difficultyLevel == null || difficultyLevel.isBlank()) {
            return null;
        }

        try {
            return CourseDifficultyLevel.valueOf(difficultyLevel.toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new CustomException(ErrorCode.INVALID_COURSE_DIFFICULTY_LEVEL);
        }
    }
}