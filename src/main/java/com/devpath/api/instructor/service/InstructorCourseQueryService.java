package com.devpath.api.instructor.service;

import com.devpath.api.common.dto.CourseDetailResponse;
import com.devpath.api.instructor.dto.course.InstructorCourseListResponse;
import com.devpath.api.review.entity.Review;
import com.devpath.api.review.repository.ReviewRepository;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.course.entity.Course;
import com.devpath.domain.course.entity.CourseEnrollment;
import com.devpath.domain.course.entity.CourseInfoSectionItem;
import com.devpath.domain.course.entity.CourseMaterial;
import com.devpath.domain.course.entity.CourseObjective;
import com.devpath.domain.course.entity.CourseSection;
import com.devpath.domain.course.entity.CourseTagMap;
import com.devpath.domain.course.entity.CourseTargetAudience;
import com.devpath.domain.course.entity.EnrollmentStatus;
import com.devpath.domain.course.entity.Lesson;
import com.devpath.domain.course.repository.CourseEnrollmentRepository;
import com.devpath.domain.course.repository.CourseInfoSectionItemRepository;
import com.devpath.domain.course.repository.CourseMaterialRepository;
import com.devpath.domain.course.repository.CourseObjectiveRepository;
import com.devpath.domain.course.repository.CourseRepository;
import com.devpath.domain.course.repository.CourseSectionRepository;
import com.devpath.domain.course.repository.CourseTagMapRepository;
import com.devpath.domain.course.repository.CourseTargetAudienceRepository;
import com.devpath.domain.course.repository.LessonRepository;
import com.devpath.domain.qna.repository.QuestionRepository;
import com.devpath.domain.user.entity.UserProfile;
import com.devpath.domain.user.repository.UserProfileRepository;
import com.devpath.domain.user.repository.UserRepository;
import com.devpath.domain.user.repository.UserTechStackRepository;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// 강사용 강의 상세 조회 비즈니스 로직을 처리한다.
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class InstructorCourseQueryService {

  private static final String INFO_SECTION_TARGET_AUDIENCE = "TARGET_AUDIENCE";
  private static final String INFO_SECTION_PREREQUISITES = "PREREQUISITES";
  private static final String INFO_SECTION_OBJECTIVES = "OBJECTIVES";

  private static final String DEFAULT_COURSE_THUMBNAIL =
      "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80";
  private static final String DEFAULT_COURSE_CATEGORY = "General";

  private static final Map<String, String> COURSE_THUMBNAIL_FALLBACKS =
      Map.ofEntries(
          Map.entry(
              "Spring Boot Intro",
              "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80"),
          Map.entry(
              "JPA Practical Design",
              "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80"),
          Map.entry(
              "React Dashboard Sprint",
              "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80"),
          Map.entry(
              "[A-CASE-A] Node Clearance Course",
              "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80"),
          Map.entry(
              "[A-CASE-B] Tag Missing Course",
              "https://images.unsplash.com/photo-1504639725590-34d0984388bd?auto=format&fit=crop&w=1200&q=80"),
          Map.entry(
              "[A-CASE-C] Quiz Fail Course",
              "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1200&q=80"));

  private final UserRepository userRepository;
  private final CourseRepository courseRepository;
  private final CourseEnrollmentRepository courseEnrollmentRepository;
  private final CourseSectionRepository courseSectionRepository;
  private final LessonRepository lessonRepository;
  private final CourseMaterialRepository courseMaterialRepository;
  private final CourseInfoSectionItemRepository courseInfoSectionItemRepository;
  private final CourseObjectiveRepository courseObjectiveRepository;
  private final CourseTargetAudienceRepository courseTargetAudienceRepository;
  private final CourseTagMapRepository courseTagMapRepository;
  private final QuestionRepository questionRepository;
  private final ReviewRepository reviewRepository;
  private final UserProfileRepository userProfileRepository;
  private final UserTechStackRepository userTechStackRepository;

  public List<InstructorCourseListResponse> getCourseList(Long instructorId) {
    validateAuthenticatedUser(instructorId);

    List<Course> courses = courseRepository.findAllByInstructorIdOrderByCourseIdDesc(instructorId);
    if (courses.isEmpty()) {
      return List.of();
    }

    Map<Long, List<CourseEnrollment>> enrollmentsByCourseId =
        courseEnrollmentRepository
            .findAllByCourseInstructorIdOrderByEnrolledAtDesc(instructorId)
            .stream()
            .collect(
                Collectors.groupingBy(
                    enrollment -> enrollment.getCourse().getCourseId(),
                    LinkedHashMap::new,
                    Collectors.toList()));

    Map<Long, List<Review>> reviewsByCourseId =
        reviewRepository.findAllByInstructorIdOrderByCreatedAtDesc(instructorId).stream()
            .collect(
                Collectors.groupingBy(
                    Review::getCourseId, LinkedHashMap::new, Collectors.toList()));

    return courses.stream()
        .map(
            course -> {
              List<CourseEnrollment> enrollments =
                  enrollmentsByCourseId.getOrDefault(course.getCourseId(), List.of()).stream()
                      .filter(this::isCountableEnrollment)
                      .toList();
              List<Review> reviews =
                  reviewsByCourseId.getOrDefault(course.getCourseId(), List.of());
              List<CourseTagMap> tagMaps =
                  courseTagMapRepository.findAllByCourseCourseId(course.getCourseId());
              List<String> tags = buildCourseTagNames(tagMaps);
              List<Lesson> lessons =
                  lessonRepository.findAllBySectionCourseCourseId(course.getCourseId());

              double averageProgressPercent =
                  enrollments.stream()
                      .map(CourseEnrollment::getProgressPercentage)
                      .filter(progress -> progress != null)
                      .mapToInt(Integer::intValue)
                      .average()
                      .orElse(0.0);

              double averageRating =
                  reviews.stream()
                      .map(Review::getRating)
                      .filter(rating -> rating != null)
                      .mapToInt(Integer::intValue)
                      .average()
                      .orElse(0.0);

              return new InstructorCourseListResponse(
                  course.getCourseId(),
                  course.getTitle(),
                  course.getStatus() == null ? null : course.getStatus().name(),
                  resolveCourseCategoryLabel(tagMaps),
                  course.getDifficultyLevel() == null ? "-" : course.getDifficultyLevel().name(),
                  course.getDurationSeconds(),
                  (long) lessons.size(),
                  (long) enrollments.size(),
                  round(averageProgressPercent),
                  questionRepository.countUnansweredByCourseId(course.getCourseId()),
                  (long) reviews.size(),
                  round(averageRating),
                  resolveCourseThumbnailUrl(course),
                  course.getCreatedAt(),
                  course.getPublishedAt(),
                  tags);
            })
        .toList();
  }

  // 현재 로그인한 강사의 강의 상세 정보를 조회한다.
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
        .thumbnailUrl(resolveCourseThumbnailUrl(course))
        .introVideoUrl(course.getIntroVideoUrl())
        .videoAssetKey(course.getVideoAssetKey())
        .durationSeconds(course.getDurationSeconds())
        .prerequisites(course.getPrerequisites())
        .jobRelevance(course.getJobRelevance())
        .objectives(mapObjectives(objectives))
        .targetAudiences(mapTargetAudiences(targetAudiences))
        .infoSections(mapInfoSections(course, objectives, targetAudiences, infoSectionItems))
        .tags(mapTags(tagMaps))
        .instructor(mapInstructor(course, userProfile, specialties))
        .sections(mapSections(sections))
        .news(Collections.emptyList())
        .build();
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

  // 현재 로그인한 강사가 자신의 강의만 조회할 수 있도록 검증한다.
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

  // 강의 목표 엔티티 목록을 응답 DTO로 변환한다.
  private boolean isCountableEnrollment(CourseEnrollment enrollment) {
    EnrollmentStatus status = enrollment.getStatus();
    return status == EnrollmentStatus.ACTIVE || status == EnrollmentStatus.COMPLETED;
  }

  private List<CourseDetailResponse.ObjectiveItem> mapObjectives(List<CourseObjective> objectives) {
    return objectives.stream()
        .map(
            objective ->
                CourseDetailResponse.ObjectiveItem.builder()
                    .objectiveId(objective.getObjectiveId())
                    .objectiveText(objective.getObjectiveText())
                    .displayOrder(objective.getDisplayOrder())
                    .build())
        .toList();
  }

  // 수강 대상 엔티티 목록을 응답 DTO로 변환한다.
  private List<CourseDetailResponse.TargetAudienceItem> mapTargetAudiences(
      List<CourseTargetAudience> targetAudiences) {
    return targetAudiences.stream()
        .map(
            targetAudience ->
                CourseDetailResponse.TargetAudienceItem.builder()
                    .targetAudienceId(targetAudience.getTargetAudienceId())
                    .audienceDescription(targetAudience.getAudienceDescription())
                    .displayOrder(targetAudience.getDisplayOrder())
                    .build())
        .toList();
  }

  // 강의 태그 매핑 목록을 응답 DTO로 변환한다.
  private List<CourseDetailResponse.InfoSectionItem> mapInfoSections(
      Course course,
      List<CourseObjective> objectives,
      List<CourseTargetAudience> targetAudiences,
      List<CourseInfoSectionItem> infoSectionItems) {
    if (!infoSectionItems.isEmpty()) {
      Map<String, List<CourseInfoSectionItem>> itemsBySection =
          infoSectionItems.stream()
              .collect(
                  Collectors.groupingBy(
                      item -> item.getSectionOrder() + ":" + item.getSectionKey(),
                      LinkedHashMap::new,
                      Collectors.toList()));

      return itemsBySection.values().stream()
          .map(
              items -> {
                CourseInfoSectionItem first = items.get(0);
                return CourseDetailResponse.InfoSectionItem.builder()
                    .sectionKey(first.getSectionKey())
                    .title(first.getSectionTitle())
                    .displayOrder(first.getSectionOrder())
                    .items(items.stream().map(CourseInfoSectionItem::getItemText).toList())
                    .build();
              })
          .toList();
    }

    List<CourseDetailResponse.InfoSectionItem> fallback = new ArrayList<>();
    if (!targetAudiences.isEmpty()) {
      fallback.add(
          CourseDetailResponse.InfoSectionItem.builder()
              .sectionKey(INFO_SECTION_TARGET_AUDIENCE)
              .title("이런 분들에게 추천합니다")
              .displayOrder(fallback.size())
              .items(
                  targetAudiences.stream()
                      .map(CourseTargetAudience::getAudienceDescription)
                      .toList())
              .build());
    }
    if (course.getPrerequisites() != null && !course.getPrerequisites().isEmpty()) {
      fallback.add(
          CourseDetailResponse.InfoSectionItem.builder()
              .sectionKey(INFO_SECTION_PREREQUISITES)
              .title("수강 전 알아두면 좋아요")
              .displayOrder(fallback.size())
              .items(course.getPrerequisites())
              .build());
    }
    if (!objectives.isEmpty()) {
      fallback.add(
          CourseDetailResponse.InfoSectionItem.builder()
              .sectionKey(INFO_SECTION_OBJECTIVES)
              .title("이 강의를 듣고 나면")
              .displayOrder(fallback.size())
              .items(objectives.stream().map(CourseObjective::getObjectiveText).toList())
              .build());
    }
    return fallback;
  }

  private List<CourseDetailResponse.TagItem> mapTags(List<CourseTagMap> tagMaps) {
    return tagMaps.stream()
        .map(
            tagMap ->
                CourseDetailResponse.TagItem.builder()
                    .tagId(tagMap.getTag().getTagId())
                    .tagName(tagMap.getTag().getName())
                    .proficiencyLevel(tagMap.getProficiencyLevel())
                    .build())
        .toList();
  }

  // 강사 프로필과 기술 스택을 강사 정보 응답 DTO로 변환한다.
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

  // 강사 채널명을 반환한다.
  private String resolveChannelName(UserProfile userProfile) {
    if (userProfile == null) {
      return null;
    }

    String channelName = userProfile.getChannelName();

    if (channelName != null && !channelName.isBlank()) {
      return channelName;
    }

    if (userProfile.getUser() != null) {
      return userProfile.getUser().getName();
    }

    return null;
  }

  // 섹션 엔티티 목록을 응답 DTO로 변환한다.
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

  // 레슨 엔티티 목록을 응답 DTO로 변환한다.
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
                  .videoUrl(lesson.getVideoUrl())
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

  // 첨부 자료 엔티티 목록을 응답 DTO로 변환한다.
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

  private List<String> buildCourseTagNames(List<CourseTagMap> tagMaps) {
    return tagMaps.stream()
        .map(CourseTagMap::getTag)
        .filter(Objects::nonNull)
        .map(tag -> normalizeBlank(tag.getName()))
        .filter(Objects::nonNull)
        .distinct()
        .sorted()
        .toList();
  }

  private String resolveCourseCategoryLabel(List<CourseTagMap> tagMaps) {
    Map<String, Long> categoryCounts =
        tagMaps.stream()
            .map(CourseTagMap::getTag)
            .filter(Objects::nonNull)
            .map(tag -> normalizeCourseCategory(tag.getCategory()))
            .filter(Objects::nonNull)
            .collect(
                Collectors.groupingBy(
                    Function.identity(), LinkedHashMap::new, Collectors.counting()));

    if (categoryCounts.isEmpty()) {
      return DEFAULT_COURSE_CATEGORY;
    }

    return categoryCounts.entrySet().stream()
        .sorted(
            Comparator.<Map.Entry<String, Long>>comparingLong(Map.Entry::getValue)
                .reversed()
                .thenComparingInt(entry -> getCourseCategoryPriority(entry.getKey()))
                .thenComparing(Map.Entry::getKey))
        .map(Map.Entry::getKey)
        .findFirst()
        .orElse(DEFAULT_COURSE_CATEGORY);
  }

  private String normalizeCourseCategory(String value) {
    String normalized = normalizeBlank(value);

    if (normalized == null) {
      return null;
    }

    String categoryKey = normalized.toUpperCase(Locale.ROOT).replaceAll("[\\s/_-]+", "");

    return switch (categoryKey) {
      case "BACKEND", "SERVER", "백엔드" -> "Backend";
      case "FRONTEND", "CLIENT", "프론트엔드" -> "Frontend";
      case "AI", "AIDATA", "ARTIFICIALINTELLIGENCE", "MACHINELEARNING", "인공지능" -> "AI";
      case "DATABASE", "DB", "데이터베이스" -> "Database";
      case "DEVOPS", "데브옵스" -> "DevOps";
      case "FULLSTACK", "풀스택" -> "FullStack";
      case "GENERAL", "일반" -> DEFAULT_COURSE_CATEGORY;
      default -> null;
    };
  }

  private int getCourseCategoryPriority(String category) {
    return switch (category) {
      case "Backend" -> 1;
      case "Frontend" -> 2;
      case "AI" -> 3;
      case "Database" -> 4;
      case "DevOps" -> 5;
      case "FullStack" -> 6;
      case DEFAULT_COURSE_CATEGORY -> 7;
      default -> 99;
    };
  }

  private double round(double value) {
    return Math.round(value * 10.0) / 10.0;
  }

  private String resolveCourseThumbnailUrl(Course course) {
    String thumbnailUrl = normalizeBlank(course.getThumbnailUrl());

    if (thumbnailUrl != null) {
      String normalizedThumbnailUrl = thumbnailUrl.toLowerCase();

      if (normalizedThumbnailUrl.startsWith("http://")
          || normalizedThumbnailUrl.startsWith("https://")
          || normalizedThumbnailUrl.startsWith("data:")) {
        return thumbnailUrl;
      }
    }

    return COURSE_THUMBNAIL_FALLBACKS.getOrDefault(course.getTitle(), DEFAULT_COURSE_THUMBNAIL);
  }

  private String normalizeBlank(String value) {
    if (value == null || value.isBlank()) {
      return null;
    }

    return value.trim();
  }
}
