package com.devpath.api.instructor.service;

import com.devpath.api.course.dto.CourseDetailResponse;
import com.devpath.api.course.mapper.CourseDetailMetadataMapper;
import com.devpath.api.course.service.HlsPlaybackService;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.course.entity.Course;
import com.devpath.domain.course.entity.CourseInfoSectionItem;
import com.devpath.domain.course.entity.CourseMaterial;
import com.devpath.domain.course.entity.CourseObjective;
import com.devpath.domain.course.entity.CourseSection;
import com.devpath.domain.course.entity.CourseTagMap;
import com.devpath.domain.course.entity.CourseTargetAudience;
import com.devpath.domain.course.entity.Lesson;
import com.devpath.domain.course.repository.CourseInfoSectionItemRepository;
import com.devpath.domain.course.repository.CourseMaterialRepository;
import com.devpath.domain.course.repository.CourseObjectiveRepository;
import com.devpath.domain.course.repository.CourseRepository;
import com.devpath.domain.course.repository.CourseSectionRepository;
import com.devpath.domain.course.repository.CourseTagMapRepository;
import com.devpath.domain.course.repository.CourseTargetAudienceRepository;
import com.devpath.domain.course.repository.LessonRepository;
import com.devpath.domain.user.entity.UserProfile;
import com.devpath.domain.user.repository.UserProfileRepository;
import com.devpath.domain.user.repository.UserRepository;
import com.devpath.domain.user.repository.UserTechStackRepository;
import java.util.Collections;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class InstructorCourseDetailQueryService {

  private final UserRepository userRepository;
  private final CourseRepository courseRepository;
  private final CourseSectionRepository courseSectionRepository;
  private final LessonRepository lessonRepository;
  private final CourseMaterialRepository courseMaterialRepository;
  private final CourseInfoSectionItemRepository courseInfoSectionItemRepository;
  private final CourseObjectiveRepository courseObjectiveRepository;
  private final CourseTargetAudienceRepository courseTargetAudienceRepository;
  private final CourseTagMapRepository courseTagMapRepository;
  private final UserProfileRepository userProfileRepository;
  private final UserTechStackRepository userTechStackRepository;
  private final CourseDetailMetadataMapper metadataMapper;
  private final HlsPlaybackService hlsPlaybackService;
  private final InstructorCourseThumbnailResolver thumbnailResolver;

  public CourseDetailResponse getCourseDetail(Long instructorId, Long courseId) {
    validateAuthenticatedUser(instructorId);
    Course course = getOwnedCourse(instructorId, courseId);

    List<CourseObjective> objectives =
        courseObjectiveRepository.findAllByCourseCourseIdOrderByDisplayOrderAsc(courseId);
    List<CourseTargetAudience> targetAudiences =
        courseTargetAudienceRepository.findAllByCourseCourseIdOrderByDisplayOrderAsc(courseId);
    List<CourseInfoSectionItem> infoSectionItems =
        courseInfoSectionItemRepository
            .findAllByCourseCourseIdOrderBySectionOrderAscItemOrderAscInfoSectionItemIdAsc(
                courseId);
    List<CourseTagMap> tagMaps = courseTagMapRepository.findAllByCourseCourseId(courseId);
    List<CourseSection> sections =
        courseSectionRepository.findAllByCourseCourseIdOrderBySortOrderAsc(courseId);
    UserProfile userProfile =
        userProfileRepository.findByUserId(course.getInstructorId()).orElse(null);
    List<String> specialties =
        userTechStackRepository.findTagNamesByUserId(course.getInstructorId());

    return CourseDetailResponse.builder()
        .courseId(course.getCourseId())
        .title(course.getTitle())
        .subtitle(course.getSubtitle())
        .description(course.getDescription())
        .status(course.getStatus() == null ? null : course.getStatus().name())
        .price(course.getPrice())
        .originalPrice(course.getOriginalPrice())
        .currency(course.getCurrency())
        .difficultyLevel(
            course.getDifficultyLevel() == null ? null : course.getDifficultyLevel().name())
        .language(course.getLanguage())
        .hasCertificate(course.getHasCertificate())
        .thumbnailUrl(thumbnailResolver.resolve(course))
        .introVideoUrl(course.getIntroVideoUrl())
        .videoAssetKey(course.getVideoAssetKey())
        .durationSeconds(course.getDurationSeconds())
        .prerequisites(course.getPrerequisites())
        .jobRelevance(course.getJobRelevance())
        .objectives(metadataMapper.mapObjectives(objectives))
        .targetAudiences(metadataMapper.mapTargetAudiences(targetAudiences))
        .infoSections(
            metadataMapper.mapInfoSections(course, objectives, targetAudiences, infoSectionItems))
        .tags(metadataMapper.mapTags(tagMaps))
        .instructor(mapInstructor(course, userProfile, specialties))
        .sections(mapSections(sections))
        .news(Collections.emptyList())
        .build();
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

  private CourseDetailResponse.InstructorInfo mapInstructor(
      Course course, UserProfile userProfile, List<String> specialties) {
    Long instructorId = course.getInstructorId();
    return CourseDetailResponse.InstructorInfo.builder()
        .instructorId(instructorId)
        .channelName(resolveChannelName(userProfile))
        .profileImage(userProfile == null ? null : userProfile.getDisplayProfileImage())
        .headline(userProfile == null ? null : userProfile.getBio())
        .specialties(specialties == null ? Collections.emptyList() : specialties)
        .channelApiPath("/api/instructors/" + instructorId + "/channel")
        .build();
  }

  private String resolveChannelName(UserProfile userProfile) {
    if (userProfile == null) {
      return null;
    }
    String channelName = userProfile.getChannelName();
    if (channelName != null && !channelName.isBlank()) {
      return channelName;
    }
    return userProfile.getUser() == null ? null : userProfile.getUser().getName();
  }

  private List<CourseDetailResponse.SectionItem> mapSections(List<CourseSection> sections) {
    return sections.stream()
        .map(
            section -> {
              List<Lesson> lessons =
                  lessonRepository.findAllBySectionSectionIdOrderBySortOrderAsc(
                      section.getSectionId());
              return CourseDetailResponse.SectionItem.builder()
                  .sectionId(section.getSectionId())
                  .title(section.getTitle())
                  .description(section.getDescription())
                  .sortOrder(section.getOrderIndex())
                  .isPublished(section.getIsPublished())
                  .lessons(mapLessons(lessons))
                  .build();
            })
        .toList();
  }

  private List<CourseDetailResponse.LessonItem> mapLessons(List<Lesson> lessons) {
    return lessons.stream()
        .map(
            lesson -> {
              List<CourseMaterial> materials =
                  courseMaterialRepository.findAllByLessonLessonIdOrderBySortOrderAsc(
                      lesson.getLessonId());
              return CourseDetailResponse.LessonItem.builder()
                  .lessonId(lesson.getLessonId())
                  .title(lesson.getTitle())
                  .description(lesson.getDescription())
                  .lessonType(lesson.getLessonType() == null ? null : lesson.getLessonType().name())
                  .videoUrl(
                      hlsPlaybackService.issuePlaybackUrl(
                          lesson, lesson.getSection().getCourse().getInstructorId()))
                  .videoAssetKey(lesson.getVideoId())
                  .thumbnailUrl(lesson.getThumbnailUrl())
                  .durationSeconds(lesson.getDurationSeconds())
                  .isPreview(lesson.getIsPreview())
                  .isPublished(lesson.getIsPublished())
                  .sortOrder(lesson.getOrderIndex())
                  .materials(mapMaterials(materials))
                  .build();
            })
        .toList();
  }

  private List<CourseDetailResponse.MaterialItem> mapMaterials(List<CourseMaterial> materials) {
    return materials.stream()
        .map(
            material ->
                CourseDetailResponse.MaterialItem.builder()
                    .materialId(material.getMaterialId())
                    .materialType(material.getMaterialType())
                    .materialUrl(material.getMaterialUrl())
                    .assetKey(material.getAssetKey())
                    .originalFileName(material.getOriginalFileName())
                    .sortOrder(material.getDisplayOrder())
                    .build())
        .toList();
  }
}
