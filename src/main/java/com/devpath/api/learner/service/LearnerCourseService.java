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
import com.devpath.domain.course.repository.CourseAnnouncementRepository;
import com.devpath.domain.course.repository.CourseMaterialRepository;
import com.devpath.domain.course.repository.CourseObjectiveRepository;
import com.devpath.domain.course.repository.CourseRepository;
import com.devpath.domain.course.repository.CourseSectionRepository;
import com.devpath.domain.course.repository.CourseTagMapRepository;
import com.devpath.domain.course.repository.CourseTargetAudienceRepository;
import com.devpath.domain.course.repository.LessonRepository;
import com.devpath.domain.user.entity.UserProfile;
import com.devpath.domain.user.repository.UserProfileRepository;
import com.devpath.domain.user.repository.UserTechStackRepository;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
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
    private final UserProfileRepository userProfileRepository;
    private final UserTechStackRepository userTechStackRepository;
    private final CourseWishlistService courseWishlistService;
    private final CourseEnrollmentService courseEnrollmentService;

    public List<CourseListItemResponse> getCourseList(Long userId) {
        return courseRepository.findByStatus(CourseStatus.PUBLISHED).stream()
                .sorted(
                        Comparator.comparing(
                                        Course::getPublishedAt,
                                        Comparator.nullsLast(Comparator.reverseOrder())
                                )
                                .thenComparing(Course::getCourseId, Comparator.reverseOrder())
                )
                .map(course -> mapCourseListItem(course, userId))
                .toList();
    }

    public CourseDetailResponse getCourseDetail(Long userId, Long courseId) {
        Course course = courseRepository.findByCourseIdAndStatus(courseId, CourseStatus.PUBLISHED)
                .orElseThrow(() -> new CustomException(ErrorCode.COURSE_NOT_FOUND));

        List<CourseObjective> objectives =
                courseObjectiveRepository.findAllByCourseCourseIdOrderByDisplayOrderAsc(courseId);
        List<CourseTargetAudience> targetAudiences =
                courseTargetAudienceRepository.findAllByCourseCourseIdOrderByDisplayOrderAsc(courseId);
        List<CourseTagMap> tagMaps =
                courseTagMapRepository.findAllByCourseCourseId(courseId);
        List<CourseSection> sections =
                courseSectionRepository.findAllByCourseCourseIdOrderBySortOrderAsc(courseId);
        UserProfile userProfile = userProfileRepository.findByUserId(course.getInstructorId()).orElse(null);
        List<String> specialties = userTechStackRepository.findTagNamesByUserId(course.getInstructorId());
        List<CourseAnnouncement> news =
                courseAnnouncementRepository.findPublicNewsTabAnnouncements(
                        courseId,
                        CourseStatus.PUBLISHED,
                        LocalDateTime.now()
                );

        return CourseDetailResponse.builder()
                .courseId(course.getCourseId())
                .title(course.getTitle())
                .subtitle(course.getSubtitle())
                .description(course.getDescription())
                .status(course.getStatus() == null ? null : course.getStatus().name())
                .price(course.getPrice())
                .originalPrice(course.getOriginalPrice())
                .currency(course.getCurrency())
                .difficultyLevel(course.getDifficultyLevel() == null ? null : course.getDifficultyLevel().name())
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
                .instructor(mapInstructor(course, userProfile, specialties))
                .sections(mapSections(sections))
                .news(mapNews(courseId, news))
                .build();
    }

    private CourseListItemResponse mapCourseListItem(Course course, Long userId) {
        UserProfile userProfile = userProfileRepository.findByUserId(course.getInstructorId()).orElse(null);

        return CourseListItemResponse.builder()
                .courseId(course.getCourseId())
                .title(course.getTitle())
                .thumbnailUrl(course.getThumbnailUrl())
                .instructorName(course.getInstructor().getName())
                .instructorChannelName(resolveChannelName(userProfile, course.getInstructor().getName()))
                .price(course.getOriginalPrice() == null ? null : course.getOriginalPrice().intValue())
                .discountPrice(course.getPrice() == null ? null : course.getPrice().intValue())
                .difficulty(mapDifficulty(course.getDifficultyLevel()))
                .tags(courseTagMapRepository.findTagNamesByCourseId(course.getCourseId()))
                .isBookmarked(isAuthenticated(userId) && courseWishlistService.isWishlisted(userId, course.getCourseId()))
                .isEnrolled(isAuthenticated(userId) && courseEnrollmentService.isEnrolled(userId, course.getCourseId()))
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
                .map(objective -> CourseDetailResponse.ObjectiveItem.builder()
                        .objectiveId(objective.getObjectiveId())
                        .objectiveText(objective.getObjectiveText())
                        .displayOrder(objective.getDisplayOrder())
                        .build())
                .toList();
    }

    private List<CourseDetailResponse.TargetAudienceItem> mapTargetAudiences(
            List<CourseTargetAudience> targetAudiences
    ) {
        return targetAudiences.stream()
                .map(targetAudience -> CourseDetailResponse.TargetAudienceItem.builder()
                        .targetAudienceId(targetAudience.getTargetAudienceId())
                        .audienceDescription(targetAudience.getAudienceDescription())
                        .displayOrder(targetAudience.getDisplayOrder())
                        .build())
                .toList();
    }

    private List<CourseDetailResponse.TagItem> mapTags(List<CourseTagMap> tagMaps) {
        return tagMaps.stream()
                .map(tagMap -> CourseDetailResponse.TagItem.builder()
                        .tagId(tagMap.getTag().getTagId())
                        .tagName(tagMap.getTag().getName())
                        .proficiencyLevel(tagMap.getProficiencyLevel())
                        .build())
                .toList();
    }

    private CourseDetailResponse.InstructorInfo mapInstructor(
            Course course,
            UserProfile userProfile,
            List<String> specialties
    ) {
        return CourseDetailResponse.InstructorInfo.builder()
                .instructorId(course.getInstructorId())
                .channelName(resolveChannelName(userProfile, course.getInstructor().getName()))
                .profileImage(userProfile == null ? null : userProfile.getProfileImage())
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

    private List<CourseDetailResponse.SectionItem> mapSections(List<CourseSection> sections) {
        return sections.stream()
                .filter(section -> Boolean.TRUE.equals(section.getIsPublished()))
                .map(section -> {
                    List<Lesson> lessons =
                            lessonRepository.findAllBySectionSectionIdOrderBySortOrderAsc(section.getSectionId());

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
                .filter(lesson -> Boolean.TRUE.equals(lesson.getIsPublished()))
                .map(lesson -> {
                    List<CourseMaterial> materials =
                            courseMaterialRepository.findAllByLessonLessonIdOrderBySortOrderAsc(lesson.getLessonId());

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

    private List<CourseDetailResponse.MaterialItem> mapMaterials(List<CourseMaterial> materials) {
        return materials.stream()
                .map(material -> CourseDetailResponse.MaterialItem.builder()
                        .materialId(material.getMaterialId())
                        .materialType(material.getMaterialType())
                        .materialUrl(material.getMaterialUrl())
                        .assetKey(material.getAssetKey())
                        .originalFileName(material.getOriginalFileName())
                        .sortOrder(material.getDisplayOrder())
                        .build())
                .toList();
    }

    private List<CourseDetailResponse.NewsItem> mapNews(Long courseId, List<CourseAnnouncement> announcements) {
        return announcements.stream()
                .map(announcement -> CourseDetailResponse.NewsItem.builder()
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
