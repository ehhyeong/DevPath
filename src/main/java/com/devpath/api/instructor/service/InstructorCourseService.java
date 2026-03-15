package com.devpath.api.instructor.service;

import com.devpath.api.instructor.dto.InstructorCourseDto;
import com.devpath.api.instructor.dto.InstructorLessonDto;
import com.devpath.api.instructor.dto.InstructorMaterialDto;
import com.devpath.api.instructor.dto.InstructorSectionDto;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.course.entity.Course;
import com.devpath.domain.course.entity.CourseDifficultyLevel;
import com.devpath.domain.course.entity.CourseMaterial;
import com.devpath.domain.course.entity.CourseObjective;
import com.devpath.domain.course.entity.CourseSection;
import com.devpath.domain.course.entity.CourseStatus;
import com.devpath.domain.course.entity.CourseTagMap;
import com.devpath.domain.course.entity.CourseTargetAudience;
import com.devpath.domain.course.entity.Lesson;
import com.devpath.domain.course.entity.LessonPrerequisite;
import com.devpath.domain.course.entity.LessonType;
import com.devpath.domain.course.repository.CourseMaterialRepository;
import com.devpath.domain.course.repository.CourseObjectiveRepository;
import com.devpath.domain.course.repository.CourseRepository;
import com.devpath.domain.course.repository.CourseSectionRepository;
import com.devpath.domain.course.repository.CourseTagMapRepository;
import com.devpath.domain.course.repository.CourseTargetAudienceRepository;
import com.devpath.domain.course.repository.LessonPrerequisiteRepository;
import com.devpath.domain.course.repository.LessonRepository;
import com.devpath.domain.user.entity.Tag;
import com.devpath.domain.user.repository.TagRepository;
import com.devpath.domain.user.repository.UserRepository;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// Handles instructor-owned course, section, lesson, and lesson asset mutations.
@Service
@RequiredArgsConstructor
public class InstructorCourseService {

  private final UserRepository userRepository;
  private final TagRepository tagRepository;

  private final CourseRepository courseRepository;
  private final CourseSectionRepository courseSectionRepository;
  private final LessonRepository lessonRepository;
  private final LessonPrerequisiteRepository lessonPrerequisiteRepository;
  private final CourseMaterialRepository courseMaterialRepository;
  private final CourseObjectiveRepository courseObjectiveRepository;
  private final CourseTargetAudienceRepository courseTargetAudienceRepository;
  private final CourseTagMapRepository courseTagMapRepository;

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

  @Transactional
  public void updateCourseStatus(
      Long instructorId, Long courseId, InstructorCourseDto.UpdateStatusRequest request) {
    validateAuthenticatedUser(instructorId);

    Course course = getOwnedCourse(instructorId, courseId);
    course.changeStatus(toCourseStatus(request.getStatus()));
  }

  @Transactional
  public void deleteCourse(Long instructorId, Long courseId) {
    validateAuthenticatedUser(instructorId);

    Course course = getOwnedCourse(instructorId, courseId);
    deleteCourseChildren(courseId);
    courseRepository.delete(course);
  }

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

    CourseSection savedSection = courseSectionRepository.save(section);
    return savedSection.getSectionId();
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

    // Remove prerequisite links first so lesson deletes never hit FK conflicts.
    deleteLessonPrerequisiteLinks(lessonIds);

    for (Lesson lesson : lessons) {
      List<CourseMaterial> materials =
          courseMaterialRepository.findAllByLessonLessonIdOrderByDisplayOrderAsc(
              lesson.getLessonId());

      if (!materials.isEmpty()) {
        courseMaterialRepository.deleteAllInBatch(materials);
      }
    }

    if (!lessons.isEmpty()) {
      lessonRepository.deleteAllInBatch(lessons);
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
            .lessonType(toLessonType(request.getLessonType()))
            .videoId(request.getVideoId())
            .videoUrl(request.getVideoUrl())
            .videoProvider(request.getVideoProvider())
            .thumbnailUrl(request.getThumbnailUrl())
            .durationSeconds(request.getDurationSeconds())
            .orderIndex(request.getOrderIndex())
            .isPreview(request.getIsPreview())
            .isPublished(request.getIsPublished())
            .build();

    Lesson savedLesson = lessonRepository.save(lesson);
    return savedLesson.getLessonId();
  }

  @Transactional
  public void updateLesson(
      Long instructorId, Long lessonId, InstructorLessonDto.UpdateLessonRequest request) {
    validateAuthenticatedUser(instructorId);

    Lesson lesson = getOwnedLesson(instructorId, lessonId);
    lesson.updateInfo(
        request.getTitle(),
        request.getDescription(),
        toLessonType(request.getLessonType()),
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

    if (uniquePrerequisiteLessonIds.contains(null) || uniquePrerequisiteLessonIds.contains(lessonId)) {
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

    // Delete both incoming and outgoing links before removing the lesson itself.
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
      Lesson lesson = lessonMap.get(item.getLessonId());
      lesson.changeOrderIndex(item.getOrderIndex());
    }
  }

  @Transactional
  public void updateCourseMetadata(
      Long instructorId, Long courseId, InstructorCourseDto.UpdateMetadataRequest request) {
    validateAuthenticatedUser(instructorId);

    Course course = getOwnedCourse(instructorId, courseId);
    course.replacePrerequisites(request.getPrerequisites());
    course.replaceJobRelevance(request.getJobRelevance());
    replaceCourseTags(course, request.getTagIds());
  }

  @Transactional
  public void replaceObjectives(
      Long instructorId, Long courseId, InstructorCourseDto.ReplaceObjectivesRequest request) {
    validateAuthenticatedUser(instructorId);

    Course course = getOwnedCourse(instructorId, courseId);
    courseObjectiveRepository.deleteAllByCourseCourseId(courseId);

    List<CourseObjective> objectives = new ArrayList<>();
    for (int i = 0; i < request.getObjectives().size(); i++) {
      objectives.add(
          CourseObjective.builder()
              .course(course)
              .objectiveText(request.getObjectives().get(i))
              .displayOrder(i)
              .build());
    }

    courseObjectiveRepository.saveAll(objectives);
  }

  @Transactional
  public void replaceTargetAudiences(
      Long instructorId,
      Long courseId,
      InstructorCourseDto.ReplaceTargetAudiencesRequest request) {
    validateAuthenticatedUser(instructorId);

    Course course = getOwnedCourse(instructorId, courseId);
    courseTargetAudienceRepository.deleteAllByCourseCourseId(courseId);

    List<CourseTargetAudience> targetAudiences = new ArrayList<>();
    for (int i = 0; i < request.getTargetAudiences().size(); i++) {
      targetAudiences.add(
          CourseTargetAudience.builder()
              .course(course)
              .audienceDescription(request.getTargetAudiences().get(i))
              .displayOrder(i)
              .build());
    }

    courseTargetAudienceRepository.saveAll(targetAudiences);
  }

  @Transactional
  public Long createMaterial(
      Long instructorId, Long lessonId, InstructorMaterialDto.CreateMaterialRequest request) {
    validateAuthenticatedUser(instructorId);

    Lesson lesson = getOwnedLesson(instructorId, lessonId);

    CourseMaterial material =
        CourseMaterial.builder()
            .lesson(lesson)
            .materialType(request.getMaterialType())
            .materialUrl(request.getMaterialUrl())
            .assetKey(request.getAssetKey())
            .originalFileName(request.getOriginalFileName())
            .displayOrder(request.getDisplayOrder())
            .build();

    CourseMaterial savedMaterial = courseMaterialRepository.save(material);
    return savedMaterial.getMaterialId();
  }

  @Transactional
  public void uploadThumbnail(
      Long instructorId, Long courseId, InstructorCourseDto.UploadThumbnailRequest request) {
    validateAuthenticatedUser(instructorId);

    Course course = getOwnedCourse(instructorId, courseId);
    course.updateThumbnail(request.getThumbnailUrl());
  }

  @Transactional
  public void uploadTrailer(
      Long instructorId, Long courseId, InstructorCourseDto.UploadTrailerRequest request) {
    validateAuthenticatedUser(instructorId);

    Course course = getOwnedCourse(instructorId, courseId);
    course.updateTrailer(
        request.getTrailerUrl(), request.getVideoAssetKey(), request.getDurationSeconds());
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

    Set<Long> actualLessonIds = lessons.stream().map(Lesson::getLessonId).collect(Collectors.toSet());
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

  private void replaceCourseTags(Course course, List<Long> tagIds) {
    List<Tag> tags = tagRepository.findAllById(tagIds);

    if (tags.size() != tagIds.size()) {
      throw new CustomException(ErrorCode.TAG_NOT_FOUND);
    }

    courseTagMapRepository.deleteAllByCourseCourseId(course.getCourseId());

    List<CourseTagMap> mappings =
        tags.stream()
            .map(tag -> CourseTagMap.builder().course(course).tag(tag).proficiencyLevel(3).build())
            .toList();

    courseTagMapRepository.saveAll(mappings);
  }

  private void deleteCourseChildren(Long courseId) {
    List<Long> lessonIds =
        lessonRepository.findAllBySectionCourseCourseId(courseId).stream()
            .map(Lesson::getLessonId)
            .toList();

    deleteLessonPrerequisiteLinks(lessonIds);

    courseMaterialRepository.deleteAllByLessonSectionCourseCourseId(courseId);
    lessonRepository.deleteAllBySectionCourseCourseId(courseId);
    courseSectionRepository.deleteAllByCourseCourseId(courseId);
    courseObjectiveRepository.deleteAllByCourseCourseId(courseId);
    courseTargetAudienceRepository.deleteAllByCourseCourseId(courseId);
    courseTagMapRepository.deleteAllByCourseCourseId(courseId);
  }

  // Restricts prerequisites to owned lessons from the same course as the target lesson.
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
            .anyMatch(lesson -> !targetCourseId.equals(lesson.getSection().getCourse().getCourseId()));

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

  private CourseStatus toCourseStatus(String status) {
    try {
      return CourseStatus.valueOf(status.toUpperCase(Locale.ROOT));
    } catch (IllegalArgumentException e) {
      throw new CustomException(ErrorCode.INVALID_COURSE_STATUS);
    }
  }

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

  private LessonType toLessonType(String lessonType) {
    try {
      return LessonType.valueOf(lessonType.toUpperCase(Locale.ROOT));
    } catch (IllegalArgumentException | NullPointerException e) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }
  }
}
