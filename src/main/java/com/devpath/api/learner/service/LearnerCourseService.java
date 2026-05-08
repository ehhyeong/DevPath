package com.devpath.api.learner.service;

import com.devpath.api.common.dto.CourseDetailResponse;
import com.devpath.api.common.dto.CourseListItemResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.course.entity.Course;
import com.devpath.domain.course.entity.CourseAnnouncement;
import com.devpath.domain.course.entity.CourseDifficulty;
import com.devpath.domain.course.entity.CourseDifficultyLevel;
import com.devpath.domain.course.entity.CourseMaterial;
import com.devpath.domain.course.entity.CourseObjective;
import com.devpath.domain.course.entity.CourseSection;
import com.devpath.domain.course.entity.CourseStatus;
import com.devpath.domain.course.entity.CourseTagMap;
import com.devpath.domain.course.entity.CourseTargetAudience;
import com.devpath.domain.course.entity.Lesson;
import com.devpath.domain.course.entity.LessonType;
import com.devpath.domain.course.repository.CourseAnnouncementRepository;
import com.devpath.domain.course.repository.CourseMaterialRepository;
import com.devpath.domain.course.repository.CourseObjectiveRepository;
import com.devpath.domain.course.repository.CourseRepository;
import com.devpath.domain.course.repository.CourseSectionRepository;
import com.devpath.domain.course.repository.CourseTagMapRepository;
import com.devpath.domain.course.repository.CourseTargetAudienceRepository;
import com.devpath.domain.course.repository.LessonRepository;
import com.devpath.domain.learning.entity.Assignment;
import com.devpath.domain.learning.entity.Rubric;
import com.devpath.domain.learning.entity.SubmissionType;
import com.devpath.domain.learning.repository.AssignmentRepository;
import com.devpath.domain.roadmap.entity.RoadmapNode;
import com.devpath.domain.roadmap.repository.RoadmapNodeRepository;
import com.devpath.domain.user.entity.UserProfile;
import com.devpath.domain.user.repository.UserProfileRepository;
import com.devpath.domain.user.repository.UserTechStackRepository;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LearnerCourseService {

  private final CourseRepository courseRepository;
  private final CourseTagMapRepository courseTagMapRepository;
  private final CourseSectionRepository courseSectionRepository;
  private final LessonRepository lessonRepository;
  private final CourseMaterialRepository courseMaterialRepository;
  private final CourseObjectiveRepository courseObjectiveRepository;
  private final CourseTargetAudienceRepository courseTargetAudienceRepository;
  private final CourseAnnouncementRepository courseAnnouncementRepository;
  private final AssignmentRepository assignmentRepository;
  private final RoadmapNodeRepository roadmapNodeRepository;
  private final UserProfileRepository userProfileRepository;
  private final UserTechStackRepository userTechStackRepository;
  private final CourseWishlistService courseWishlistService;
  private final CourseEnrollmentService courseEnrollmentService;

  public List<CourseListItemResponse> getCourseList(Long userId) {
    List<Course> courses =
        courseRepository.findByStatus(CourseStatus.PUBLISHED).stream()
            .sorted(
                Comparator.comparing(
                        Course::getPublishedAt, Comparator.nullsLast(Comparator.reverseOrder()))
                    .thenComparing(Course::getCourseId, Comparator.reverseOrder()))
            .toList();

    if (courses.isEmpty()) {
      return List.of();
    }

    List<Long> courseIds = courses.stream().map(Course::getCourseId).toList();
    List<Long> instructorIds = courses.stream().map(Course::getInstructorId).distinct().toList();

    Map<Long, UserProfile> profilesByInstructorId =
        userProfileRepository.findAllByUserIdIn(instructorIds).stream()
            .collect(Collectors.toMap(profile -> profile.getUser().getId(), Function.identity()));
    Map<Long, List<String>> tagNamesByCourseId =
        courseTagMapRepository.findAllByCourseCourseIdInOrderByCourseAndTagName(courseIds).stream()
            .collect(
                Collectors.groupingBy(
                    tagMap -> tagMap.getCourse().getCourseId(),
                    Collectors.mapping(tagMap -> tagMap.getTag().getName(), Collectors.toList())));
    Set<Long> wishlistedCourseIds =
        isAuthenticated(userId)
            ? courseWishlistService.getWishlistedCourseIds(userId, courseIds)
            : Set.of();
    Set<Long> enrolledCourseIds =
        isAuthenticated(userId)
            ? courseEnrollmentService.getEnrolledCourseIds(userId, courseIds)
            : Set.of();

    return courses.stream()
        .map(
            course ->
                mapCourseListItem(
                    course,
                    profilesByInstructorId.get(course.getInstructorId()),
                    tagNamesByCourseId.getOrDefault(course.getCourseId(), List.of()),
                    wishlistedCourseIds.contains(course.getCourseId()),
                    enrolledCourseIds.contains(course.getCourseId())))
        .toList();
  }

  public CourseDetailResponse getCourseDetail(Long userId, Long courseId) {
    Course course =
        courseRepository
            .findByCourseIdAndStatus(courseId, CourseStatus.PUBLISHED)
            .orElseThrow(() -> new CustomException(ErrorCode.COURSE_NOT_FOUND));

    List<CourseObjective> objectives =
        courseObjectiveRepository.findAllByCourseCourseIdOrderByDisplayOrderAsc(courseId);
    List<CourseTargetAudience> targetAudiences =
        courseTargetAudienceRepository.findAllByCourseCourseIdOrderByDisplayOrderAsc(courseId);
    List<CourseTagMap> tagMaps = courseTagMapRepository.findAllByCourseCourseId(courseId);
    List<CourseSection> sections =
        courseSectionRepository.findAllByCourseCourseIdOrderBySortOrderAsc(courseId);
    List<Long> sectionIds = sections.stream().map(CourseSection::getSectionId).toList();
    List<Lesson> lessons =
        sectionIds.isEmpty()
            ? List.of()
            : lessonRepository.findAllBySectionIdsInDisplayOrder(sectionIds);
    Map<Long, List<Lesson>> lessonsBySectionId =
        lessons.stream()
            .collect(Collectors.groupingBy(lesson -> lesson.getSection().getSectionId()));
    List<Long> lessonIds = lessons.stream().map(Lesson::getLessonId).toList();
    List<CourseMaterial> materials =
        lessonIds.isEmpty()
            ? List.of()
            : courseMaterialRepository.findAllByLessonIdsInDisplayOrder(lessonIds);
    Map<Long, List<CourseMaterial>> materialsByLessonId =
        materials.stream()
            .collect(Collectors.groupingBy(material -> material.getLesson().getLessonId()));
    AssignmentMapping assignmentMapping = loadAssignmentMapping(lessons);
    UserProfile userProfile =
        userProfileRepository.findByUserId(course.getInstructorId()).orElse(null);
    List<String> specialties =
        userTechStackRepository.findTagNamesByUserId(course.getInstructorId());
    List<CourseAnnouncement> news =
        courseAnnouncementRepository.findPublicNewsTabAnnouncements(
            courseId, CourseStatus.PUBLISHED, LocalDateTime.now());
    boolean isBookmarked =
        isAuthenticated(userId) && courseWishlistService.isWishlisted(userId, courseId);
    boolean isEnrolled =
        isAuthenticated(userId) && courseEnrollmentService.isEnrolled(userId, courseId);

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
        .thumbnailUrl(course.getThumbnailUrl())
        .introVideoUrl(course.getIntroVideoUrl())
        .videoAssetKey(course.getVideoAssetKey())
        .durationSeconds(course.getDurationSeconds())
        .prerequisites(course.getPrerequisites())
        .jobRelevance(course.getJobRelevance())
        .objectives(mapObjectives(objectives))
        .targetAudiences(mapTargetAudiences(targetAudiences))
        .tags(mapTags(tagMaps))
        .isBookmarked(isBookmarked)
        .isEnrolled(isEnrolled)
        .instructor(mapInstructor(course, userProfile, specialties))
        .sections(mapSections(sections, lessonsBySectionId, materialsByLessonId, assignmentMapping))
        .news(mapNews(courseId, news))
        .build();
  }

  private CourseListItemResponse mapCourseListItem(
      Course course,
      UserProfile userProfile,
      List<String> tagNames,
      boolean isBookmarked,
      boolean isEnrolled) {
    return CourseListItemResponse.builder()
        .courseId(course.getCourseId())
        .title(course.getTitle())
        .thumbnailUrl(course.getThumbnailUrl())
        .instructorName(course.getInstructor().getName())
        .instructorChannelName(resolveChannelName(userProfile, course.getInstructor().getName()))
        .price(course.getOriginalPrice() == null ? null : course.getOriginalPrice().intValue())
        .discountPrice(course.getPrice() == null ? null : course.getPrice().intValue())
        .difficulty(mapDifficulty(course.getDifficultyLevel()))
        .tags(tagNames)
        .isBookmarked(isBookmarked)
        .isEnrolled(isEnrolled)
        .status(course.getStatus())
        .build();
  }

  private CourseDifficulty mapDifficulty(CourseDifficultyLevel difficultyLevel) {
    if (difficultyLevel == null || difficultyLevel == CourseDifficultyLevel.ALL) {
      return null;
    }

    return CourseDifficulty.valueOf(difficultyLevel.name());
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

  private CourseDetailResponse.InstructorInfo mapInstructor(
      Course course, UserProfile userProfile, List<String> specialties) {
    return CourseDetailResponse.InstructorInfo.builder()
        .instructorId(course.getInstructorId())
        .channelName(resolveChannelName(userProfile, course.getInstructor().getName()))
        .profileImage(userProfile == null ? null : userProfile.getDisplayProfileImage())
        .headline(userProfile == null ? null : userProfile.getBio())
        .specialties(specialties == null ? Collections.emptyList() : specialties)
        .channelApiPath("/api/instructors/" + course.getInstructorId() + "/channel")
        .build();
  }

  private String resolveChannelName(UserProfile userProfile, String fallbackName) {
    if (userProfile == null) {
      return fallbackName;
    }

    String channelName = userProfile.getChannelName();
    if (channelName != null && !channelName.isBlank()) {
      return channelName;
    }

    return fallbackName;
  }

  private List<CourseDetailResponse.SectionItem> mapSections(
      List<CourseSection> sections,
      Map<Long, List<Lesson>> lessonsBySectionId,
      Map<Long, List<CourseMaterial>> materialsByLessonId,
      AssignmentMapping assignmentMapping) {
    return sections.stream()
        .filter(section -> Boolean.TRUE.equals(section.getIsPublished()))
        .map(
            section -> {
              List<Lesson> lessons =
                  lessonsBySectionId.getOrDefault(section.getSectionId(), List.of());

              return CourseDetailResponse.SectionItem.builder()
                  .sectionId(section.getSectionId())
                  .title(section.getTitle())
                  .description(section.getDescription())
                  .sortOrder(section.getOrderIndex())
                  .isPublished(section.getIsPublished())
                  .lessons(mapLessons(lessons, materialsByLessonId, assignmentMapping))
                  .build();
            })
        .toList();
  }

  private List<CourseDetailResponse.LessonItem> mapLessons(
      List<Lesson> lessons,
      Map<Long, List<CourseMaterial>> materialsByLessonId,
      AssignmentMapping assignmentMapping) {
    return lessons.stream()
        .filter(lesson -> Boolean.TRUE.equals(lesson.getIsPublished()))
        .map(
            lesson -> {
              List<CourseMaterial> materials =
                  materialsByLessonId.getOrDefault(lesson.getLessonId(), List.of());
              Assignment assignment = resolveAssignmentForLesson(lesson, assignmentMapping);

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
                  .assignment(mapAssignment(assignment))
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

  private AssignmentMapping loadAssignmentMapping(List<Lesson> lessons) {
    Map<AssignmentLookupKey, Long> fallbackAssignmentNodeIdsByKey =
        loadFallbackAssignmentNodeIdsByKey(lessons);
    List<Long> assignmentNodeIds =
        Stream.concat(
                lessons.stream()
                    .map(Lesson::getAssignmentRoadmapNode)
                    .filter(Objects::nonNull)
                    .map(RoadmapNode::getNodeId),
                fallbackAssignmentNodeIdsByKey.values().stream())
            .distinct()
            .toList();
    if (assignmentNodeIds.isEmpty()) {
      return new AssignmentMapping(Map.of(), fallbackAssignmentNodeIdsByKey);
    }

    Map<Long, Assignment> assignmentsByNodeId = new LinkedHashMap<>();
    assignmentRepository
        .findAllByRoadmapNodeNodeIdInAndIsDeletedFalseOrderByCreatedAtDesc(assignmentNodeIds)
        .forEach(
            assignment -> {
              if (!Boolean.TRUE.equals(assignment.getIsPublished())
                  || !Boolean.TRUE.equals(assignment.getIsActive())) {
                return;
              }

              assignmentsByNodeId.putIfAbsent(assignment.getRoadmapNode().getNodeId(), assignment);
            });
    return new AssignmentMapping(assignmentsByNodeId, fallbackAssignmentNodeIdsByKey);
  }

  private Map<AssignmentLookupKey, Long> loadFallbackAssignmentNodeIdsByKey(List<Lesson> lessons) {
    List<AssignmentLookupKey> lookupKeys =
        lessons.stream()
            .filter(this::requiresAssignmentFallback)
            .map(this::toAssignmentLookupKey)
            .filter(Objects::nonNull)
            .distinct()
            .toList();
    if (lookupKeys.isEmpty()) {
      return Map.of();
    }

    List<String> courseTitles =
        lookupKeys.stream().map(AssignmentLookupKey::courseTitle).distinct().toList();
    List<Integer> branchGroups =
        lookupKeys.stream().map(AssignmentLookupKey::sectionOrder).distinct().toList();

    return roadmapNodeRepository
        .findOfficialPublicNodesByNodeTypeAndSubTopicsInAndBranchGroupIn(
            "ASSIGNMENT", courseTitles, branchGroups)
        .stream()
        .collect(
            Collectors.toMap(
                node -> new AssignmentLookupKey(node.getSubTopics(), node.getBranchGroup()),
                RoadmapNode::getNodeId,
                (current, ignored) -> current,
                LinkedHashMap::new));
  }

  private Assignment resolveAssignmentForLesson(
      Lesson lesson, AssignmentMapping assignmentMapping) {
    Long assignmentNodeId =
        lesson.getAssignmentRoadmapNode() != null
            ? lesson.getAssignmentRoadmapNode().getNodeId()
            : resolveFallbackAssignmentNodeId(lesson, assignmentMapping.assignmentNodeIdsByKey());
    if (assignmentNodeId == null) {
      return null;
    }

    return assignmentMapping.assignmentsByNodeId().get(assignmentNodeId);
  }

  private Long resolveFallbackAssignmentNodeId(
      Lesson lesson, Map<AssignmentLookupKey, Long> assignmentNodeIdsByKey) {
    AssignmentLookupKey lookupKey = toAssignmentLookupKey(lesson);
    if (lookupKey == null) {
      return null;
    }

    return assignmentNodeIdsByKey.get(lookupKey);
  }

  private boolean requiresAssignmentFallback(Lesson lesson) {
    return isAssignmentLesson(lesson) && lesson.getAssignmentRoadmapNode() == null;
  }

  private boolean isAssignmentLesson(Lesson lesson) {
    return lesson.getLessonType() == LessonType.CODING;
  }

  private AssignmentLookupKey toAssignmentLookupKey(Lesson lesson) {
    if (!isAssignmentLesson(lesson)
        || lesson.getSection() == null
        || lesson.getSection().getCourse() == null) {
      return null;
    }

    String courseTitle = lesson.getSection().getCourse().getTitle();
    Integer sectionOrder = lesson.getSection().getOrderIndex();
    if (courseTitle == null || courseTitle.isBlank() || sectionOrder == null) {
      return null;
    }

    return new AssignmentLookupKey(courseTitle, sectionOrder);
  }

  private CourseDetailResponse.AssignmentItem mapAssignment(Assignment assignment) {
    if (assignment == null) {
      return null;
    }

    List<String> allowedFileFormats =
        assignment.getAllowedFileFormats() == null
            ? List.of()
            : Arrays.stream(assignment.getAllowedFileFormats().split(","))
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .toList();
    List<CourseDetailResponse.AssignmentRubricItem> rubrics =
        assignment.getRubrics().stream()
            .filter(rubric -> !Boolean.TRUE.equals(rubric.getIsDeleted()))
            .sorted(
                Comparator.comparing(
                    Rubric::getDisplayOrder, Comparator.nullsLast(Comparator.naturalOrder())))
            .map(
                rubric ->
                    CourseDetailResponse.AssignmentRubricItem.builder()
                        .rubricId(rubric.getId())
                        .criteriaName(rubric.getCriteriaName())
                        .criteriaDescription(rubric.getCriteriaDescription())
                        .maxPoints(rubric.getMaxPoints())
                        .displayOrder(rubric.getDisplayOrder())
                        .build())
            .toList();
    AssignmentSubmissionFlags submissionFlags = resolveAssignmentSubmissionFlags(assignment);

    return CourseDetailResponse.AssignmentItem.builder()
        .assignmentId(assignment.getId())
        .roadmapNodeId(assignment.getRoadmapNode().getNodeId())
        .title(assignment.getTitle())
        .description(assignment.getDescription())
        .submissionRuleDescription(assignment.getSubmissionRuleDescription())
        .totalScore(assignment.getTotalScore())
        .passScore(assignment.getPassScore())
        .aiReviewEnabled(assignment.getAiReviewEnabled())
        .allowTextSubmission(submissionFlags.allowTextSubmission())
        .allowFileSubmission(submissionFlags.allowFileSubmission())
        .allowUrlSubmission(submissionFlags.allowUrlSubmission())
        .readmeRequired(assignment.getReadmeRequired())
        .testRequired(assignment.getTestRequired())
        .lintRequired(assignment.getLintRequired())
        .allowLateSubmission(assignment.getAllowLateSubmission())
        .dueAt(assignment.getDueAt())
        .allowedFileFormats(allowedFileFormats)
        .rubrics(rubrics)
        .build();
  }

  private AssignmentSubmissionFlags resolveAssignmentSubmissionFlags(Assignment assignment) {
    if (assignment.getAllowTextSubmission() != null
        || assignment.getAllowFileSubmission() != null
        || assignment.getAllowUrlSubmission() != null) {
      return new AssignmentSubmissionFlags(
          Boolean.TRUE.equals(assignment.getAllowTextSubmission()),
          Boolean.TRUE.equals(assignment.getAllowFileSubmission()),
          Boolean.TRUE.equals(assignment.getAllowUrlSubmission()));
    }

    SubmissionType submissionType = assignment.getSubmissionType();
    if (submissionType == null) {
      return new AssignmentSubmissionFlags(true, true, false);
    }

    return switch (submissionType) {
      case FILE -> new AssignmentSubmissionFlags(false, true, false);
      case URL -> new AssignmentSubmissionFlags(false, false, true);
      case TEXT -> new AssignmentSubmissionFlags(true, false, false);
      case MULTIPLE -> new AssignmentSubmissionFlags(true, true, true);
    };
  }

  private record AssignmentSubmissionFlags(
      boolean allowTextSubmission, boolean allowFileSubmission, boolean allowUrlSubmission) {}

  private record AssignmentLookupKey(String courseTitle, Integer sectionOrder) {}

  private record AssignmentMapping(
      Map<Long, Assignment> assignmentsByNodeId,
      Map<AssignmentLookupKey, Long> assignmentNodeIdsByKey) {}

  private List<CourseDetailResponse.NewsItem> mapNews(
      Long courseId, List<CourseAnnouncement> announcements) {
    return announcements.stream()
        .map(
            announcement ->
                CourseDetailResponse.NewsItem.builder()
                    .title(announcement.getTitle())
                    .url(resolveNewsUrl(courseId, announcement))
                    .build())
        .toList();
  }

  private String resolveNewsUrl(Long courseId, CourseAnnouncement announcement) {
    if (announcement.getEventLink() != null && !announcement.getEventLink().isBlank()) {
      return announcement.getEventLink();
    }

    return "/api/courses/" + courseId + "/news";
  }

  private boolean isAuthenticated(Long userId) {
    return userId != null;
  }
}
