package com.devpath.api.instructor.service;

import com.devpath.api.instructor.dto.InstructorCourseDto;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.course.entity.Course;
import com.devpath.domain.course.entity.CourseStatus;
import com.devpath.domain.course.entity.Lesson;
import com.devpath.domain.course.repository.CourseAnnouncementRepository;
import com.devpath.domain.course.repository.CourseMaterialRepository;
import com.devpath.domain.course.repository.CourseNodeMappingRepository;
import com.devpath.domain.course.repository.CourseRepository;
import com.devpath.domain.course.repository.CourseSectionRepository;
import com.devpath.domain.course.repository.LessonPrerequisiteRepository;
import com.devpath.domain.course.repository.LessonRepository;
import com.devpath.domain.system.service.SystemPolicyService;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// 강사용 강의의 생성, 기본 정보, 상태와 삭제를 관리한다.
@Service
@RequiredArgsConstructor
public class InstructorCourseService {

  private final UserRepository userRepository;

  private final CourseRepository courseRepository;
  private final CourseSectionRepository courseSectionRepository;
  private final LessonRepository lessonRepository;
  private final LessonPrerequisiteRepository lessonPrerequisiteRepository;
  private final CourseAnnouncementRepository courseAnnouncementRepository;
  private final CourseNodeMappingRepository courseNodeMappingRepository;
  private final CourseMaterialRepository courseMaterialRepository;
  private final InstructorCourseValueParser valueParser;
  private final InstructorCourseMetadataEditor metadataEditor;
  private final SystemPolicyService systemPolicyService;

  // 강의를 생성한다.
  @Transactional
  public Long createCourse(Long instructorId, InstructorCourseDto.CreateCourseRequest request) {
    validateAuthenticatedUser(instructorId);
    systemPolicyService.validateCoursePrice(request.getPrice());
    systemPolicyService.validateCoursePrice(request.getOriginalPrice());
    User instructor =
        userRepository
            .findById(instructorId)
            .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

    Course course =
        Course.builder()
            .instructor(instructor)
            .title(request.getTitle())
            .subtitle(request.getSubtitle())
            .description(request.getDescription())
            .price(request.getPrice())
            .originalPrice(request.getOriginalPrice())
            .currency(request.getCurrency())
            .difficultyLevel(valueParser.toDifficultyLevel(request.getDifficultyLevel()))
            .status(CourseStatus.DRAFT)
            .language(request.getLanguage())
            .hasCertificate(request.getHasCertificate())
            .build();

    Course savedCourse = courseRepository.save(course);
    metadataEditor.replaceCourseTags(savedCourse, request.getTagIds());
    return savedCourse.getCourseId();
  }

  // 강의 기본 정보를 수정한다.
  @Transactional
  public void updateCourse(
      Long instructorId, Long courseId, InstructorCourseDto.UpdateCourseRequest request) {
    validateAuthenticatedUser(instructorId);
    systemPolicyService.validateCoursePrice(request.getPrice());
    systemPolicyService.validateCoursePrice(request.getOriginalPrice());

    Course course = getOwnedCourse(instructorId, courseId);
    course.updateBasicInfo(
        request.getTitle(),
        request.getSubtitle(),
        request.getDescription(),
        request.getPrice(),
        request.getOriginalPrice(),
        request.getCurrency(),
        valueParser.toDifficultyLevel(request.getDifficultyLevel()),
        request.getLanguage(),
        request.getHasCertificate());
  }

  // 강의 상태를 변경한다.
  @Transactional
  public void updateCourseStatus(
      Long instructorId, Long courseId, InstructorCourseDto.UpdateStatusRequest request) {
    validateAuthenticatedUser(instructorId);

    Course course = getOwnedCourse(instructorId, courseId);
    course.changeStatus(valueParser.toCourseStatus(request.getStatus()));
  }

  // 강의를 삭제한다.
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

  // 강의 하위 데이터를 먼저 정리한다.
  private void deleteCourseChildren(Long courseId) {
    List<Long> lessonIds =
        lessonRepository.findAllBySectionCourseCourseId(courseId).stream()
            .map(Lesson::getLessonId)
            .toList();

    deleteLessonPrerequisiteLinks(lessonIds);

    courseNodeMappingRepository.deleteAllByCourseCourseId(courseId);
    courseAnnouncementRepository.deleteAllByCourseCourseId(courseId);
    courseMaterialRepository.deleteAllByLessonSectionCourseCourseId(courseId);
    lessonRepository.deleteAllBySectionCourseCourseId(courseId);
    courseSectionRepository.deleteAllByCourseCourseId(courseId);
    metadataEditor.deleteAll(courseId);
  }

  // 선행 조건 연결을 일괄 삭제한다.
  private void deleteLessonPrerequisiteLinks(List<Long> lessonIds) {
    if (lessonIds == null || lessonIds.isEmpty()) {
      return;
    }

    lessonPrerequisiteRepository.deleteAllByLessonLessonIdInOrPrerequisiteLessonLessonIdIn(
        lessonIds, lessonIds);
  }
}
