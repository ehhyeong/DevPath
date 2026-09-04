package com.devpath.api.instructor.service;

import com.devpath.api.instructor.dto.InstructorLessonDto;
import com.devpath.api.instructor.dto.InstructorSectionDto;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.course.entity.Course;
import com.devpath.domain.course.entity.CourseMaterial;
import com.devpath.domain.course.entity.CourseSection;
import com.devpath.domain.course.entity.Lesson;
import com.devpath.domain.course.entity.LessonPrerequisite;
import com.devpath.domain.course.repository.CourseMaterialRepository;
import com.devpath.domain.course.repository.CourseRepository;
import com.devpath.domain.course.repository.CourseSectionRepository;
import com.devpath.domain.course.repository.LessonPrerequisiteRepository;
import com.devpath.domain.course.repository.LessonRepository;
import com.devpath.domain.user.repository.UserRepository;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// 강사용 강의의 섹션, 레슨, 선행 조건과 레슨 순서를 편집한다.
@Service
@RequiredArgsConstructor
public class InstructorCurriculumService {

  private final UserRepository userRepository;
  private final CourseRepository courseRepository;
  private final CourseSectionRepository courseSectionRepository;
  private final LessonRepository lessonRepository;
  private final LessonPrerequisiteRepository lessonPrerequisiteRepository;
  private final CourseMaterialRepository courseMaterialRepository;
  private final InstructorCourseValueParser valueParser;

  @Transactional
  public Long createSection(
      Long instructorId, Long courseId, InstructorSectionDto.CreateSectionRequest request) {
    validateAuthenticatedUser(instructorId);

    Course course = getOwnedCourse(instructorId, courseId);
    CourseSection section =
        CourseSection.builder()
            .course(course)
            .title(request.getTitle())
            .description(request.getDescription())
            .orderIndex(request.getOrderIndex())
            .isPublished(request.getIsPublished())
            .build();

    return courseSectionRepository.save(section).getSectionId();
  }

  @Transactional
  public void updateSection(
      Long instructorId, Long sectionId, InstructorSectionDto.UpdateSectionRequest request) {
    validateAuthenticatedUser(instructorId);

    CourseSection section = getOwnedSection(instructorId, sectionId);
    section.updateInfo(request.getTitle(), request.getDescription());
    section.changeOrderIndex(request.getOrderIndex());
    section.changePublished(request.getIsPublished());
  }

  @Transactional
  public void deleteSection(Long instructorId, Long sectionId) {
    validateAuthenticatedUser(instructorId);

    CourseSection section = getOwnedSection(instructorId, sectionId);
    List<Lesson> lessons =
        lessonRepository.findAllBySectionSectionIdOrderByOrderIndexAsc(section.getSectionId());
    List<Long> lessonIds = lessons.stream().map(Lesson::getLessonId).toList();

    // 선행 조건 연결을 먼저 지워야 레슨 삭제 시 FK 충돌이 나지 않는다.
    deleteLessonPrerequisiteLinks(lessonIds);

    for (Lesson lesson : lessons) {
      List<CourseMaterial> materials =
          courseMaterialRepository.findAllByLessonLessonIdOrderByDisplayOrderAsc(
              lesson.getLessonId());

      if (!materials.isEmpty()) {
        courseMaterialRepository.deleteAll(materials);
      }
    }

    if (!lessons.isEmpty()) {
      lessonRepository.deleteAll(lessons);
    }

    courseSectionRepository.delete(section);
  }

  @Transactional
  public Long createLesson(
      Long instructorId, Long sectionId, InstructorLessonDto.CreateLessonRequest request) {
    validateAuthenticatedUser(instructorId);

    CourseSection section = getOwnedSection(instructorId, sectionId);
    Lesson lesson =
        Lesson.builder()
            .section(section)
            .title(request.getTitle())
            .description(request.getDescription())
            .lessonType(valueParser.toLessonType(request.getLessonType()))
            .videoId(request.getVideoId())
            .videoUrl(request.getVideoUrl())
            .videoProvider(request.getVideoProvider())
            .thumbnailUrl(request.getThumbnailUrl())
            .durationSeconds(request.getDurationSeconds())
            .orderIndex(request.getOrderIndex())
            .isPreview(request.getIsPreview())
            .isPublished(request.getIsPublished())
            .build();

    return lessonRepository.save(lesson).getLessonId();
  }

  @Transactional
  public void updateLesson(
      Long instructorId, Long lessonId, InstructorLessonDto.UpdateLessonRequest request) {
    validateAuthenticatedUser(instructorId);

    Lesson lesson = getOwnedLesson(instructorId, lessonId);
    lesson.updateInfo(
        request.getTitle(),
        request.getDescription(),
        valueParser.toLessonType(request.getLessonType()),
        request.getVideoId(),
        request.getVideoUrl(),
        request.getVideoProvider(),
        request.getThumbnailUrl(),
        request.getDurationSeconds(),
        request.getIsPreview(),
        request.getIsPublished());
  }

  @Transactional
  public InstructorLessonDto.UpdateLessonPrerequisitesResponse updateLessonPrerequisites(
      Long instructorId,
      Long lessonId,
      InstructorLessonDto.UpdateLessonPrerequisitesRequest request) {
    validateAuthenticatedUser(instructorId);

    Lesson lesson = getOwnedLesson(instructorId, lessonId);
    LinkedHashSet<Long> uniquePrerequisiteLessonIds =
        new LinkedHashSet<>(request.getPrerequisiteLessonIds());

    if (uniquePrerequisiteLessonIds.size() != request.getPrerequisiteLessonIds().size()) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }

    if (uniquePrerequisiteLessonIds.contains(null)
        || uniquePrerequisiteLessonIds.contains(lessonId)) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }

    List<Lesson> prerequisiteLessons =
        loadValidPrerequisiteLessons(instructorId, lesson, uniquePrerequisiteLessonIds);

    lessonPrerequisiteRepository.deleteAllByLessonLessonId(lessonId);

    if (!prerequisiteLessons.isEmpty()) {
      List<LessonPrerequisite> lessonPrerequisites =
          prerequisiteLessons.stream()
              .map(
                  prerequisiteLesson ->
                      LessonPrerequisite.builder()
                          .lesson(lesson)
                          .prerequisiteLesson(prerequisiteLesson)
                          .build())
              .toList();
      lessonPrerequisiteRepository.saveAll(lessonPrerequisites);
    }

    return InstructorLessonDto.UpdateLessonPrerequisitesResponse.builder()
        .lessonId(lessonId)
        .prerequisiteLessonIds(new ArrayList<>(uniquePrerequisiteLessonIds))
        .build();
  }

  @Transactional
  public void deleteLesson(Long instructorId, Long lessonId) {
    validateAuthenticatedUser(instructorId);

    Lesson lesson = getOwnedLesson(instructorId, lessonId);

    // 레슨이 선행 조건으로 연결된 관계까지 먼저 지워야 안전하다.
    lessonPrerequisiteRepository.deleteAllByLessonLessonIdOrPrerequisiteLessonLessonId(
        lessonId, lessonId);

    List<CourseMaterial> materials =
        courseMaterialRepository.findAllByLessonLessonIdOrderByDisplayOrderAsc(lessonId);
    if (!materials.isEmpty()) {
      courseMaterialRepository.deleteAllInBatch(materials);
    }

    lessonRepository.delete(lesson);
  }

  @Transactional
  public void updateLessonOrder(
      Long instructorId, InstructorLessonDto.UpdateLessonOrderRequest request) {
    validateAuthenticatedUser(instructorId);

    CourseSection section = getOwnedSection(instructorId, request.getSectionId());
    List<Lesson> lessons =
        lessonRepository.findAllBySectionSectionIdOrderByOrderIndexAsc(section.getSectionId());

    validateLessonOrders(lessons, request);

    Map<Long, Lesson> lessonMap =
        lessons.stream().collect(Collectors.toMap(Lesson::getLessonId, Function.identity()));
    for (InstructorLessonDto.LessonOrderItem item : request.getLessonOrders()) {
      lessonMap.get(item.getLessonId()).changeOrderIndex(item.getOrderIndex());
    }
  }

  private void validateAuthenticatedUser(Long instructorId) {
    if (instructorId == null) {
      throw new CustomException(ErrorCode.UNAUTHORIZED);
    }
    if (!userRepository.existsById(instructorId)) {
      throw new CustomException(ErrorCode.USER_NOT_FOUND);
    }
  }

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

  private CourseSection getOwnedSection(Long instructorId, Long sectionId) {
    return courseSectionRepository
        .findBySectionIdAndCourseInstructorId(sectionId, instructorId)
        .orElseGet(
            () -> {
              if (courseSectionRepository.existsById(sectionId)) {
                throw new CustomException(ErrorCode.FORBIDDEN);
              }
              throw new CustomException(ErrorCode.RESOURCE_NOT_FOUND);
            });
  }

  private Lesson getOwnedLesson(Long instructorId, Long lessonId) {
    return lessonRepository
        .findByLessonIdAndSectionCourseInstructorId(lessonId, instructorId)
        .orElseGet(
            () -> {
              if (lessonRepository.existsById(lessonId)) {
                throw new CustomException(ErrorCode.FORBIDDEN);
              }
              throw new CustomException(ErrorCode.RESOURCE_NOT_FOUND);
            });
  }

  private void validateLessonOrders(
      List<Lesson> lessons, InstructorLessonDto.UpdateLessonOrderRequest request) {
    if (lessons.isEmpty()) {
      throw new CustomException(ErrorCode.RESOURCE_NOT_FOUND);
    }

    Set<Long> actualLessonIds =
        lessons.stream().map(Lesson::getLessonId).collect(Collectors.toSet());
    Set<Long> requestedLessonIds =
        request.getLessonOrders().stream()
            .map(InstructorLessonDto.LessonOrderItem::getLessonId)
            .collect(Collectors.toSet());

    if (actualLessonIds.size() != request.getLessonOrders().size()
        || !actualLessonIds.equals(requestedLessonIds)) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }

    Set<Integer> requestedOrderIndexes = new HashSet<>();
    for (InstructorLessonDto.LessonOrderItem item : request.getLessonOrders()) {
      if (!requestedOrderIndexes.add(item.getOrderIndex())) {
        throw new CustomException(ErrorCode.INVALID_INPUT);
      }
    }
  }

  private List<Lesson> loadValidPrerequisiteLessons(
      Long instructorId, Lesson targetLesson, LinkedHashSet<Long> prerequisiteLessonIds) {
    if (prerequisiteLessonIds.isEmpty()) {
      return List.of();
    }

    List<Lesson> lessons =
        lessonRepository.findAllByLessonIdInAndSectionCourseInstructorId(
            new ArrayList<>(prerequisiteLessonIds), instructorId);
    if (lessons.size() != prerequisiteLessonIds.size()) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }

    Long targetCourseId = targetLesson.getSection().getCourse().getCourseId();
    boolean hasDifferentCourseLesson =
        lessons.stream()
            .anyMatch(
                lesson -> !targetCourseId.equals(lesson.getSection().getCourse().getCourseId()));
    if (hasDifferentCourseLesson) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }

    Map<Long, Lesson> lessonMap =
        lessons.stream().collect(Collectors.toMap(Lesson::getLessonId, Function.identity()));
    return prerequisiteLessonIds.stream()
        .map(
            prerequisiteLessonId -> {
              Lesson prerequisiteLesson = lessonMap.get(prerequisiteLessonId);
              if (prerequisiteLesson == null) {
                throw new CustomException(ErrorCode.INVALID_INPUT);
              }
              return prerequisiteLesson;
            })
        .toList();
  }

  private void deleteLessonPrerequisiteLinks(List<Long> lessonIds) {
    if (lessonIds == null || lessonIds.isEmpty()) {
      return;
    }
    lessonPrerequisiteRepository.deleteAllByLessonLessonIdInOrPrerequisiteLessonLessonIdIn(
        lessonIds, lessonIds);
  }
}
