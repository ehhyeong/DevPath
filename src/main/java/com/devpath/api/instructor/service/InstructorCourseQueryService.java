package com.devpath.api.instructor.service;

import com.devpath.api.common.dto.CourseDetailResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.course.entity.Course;
import com.devpath.domain.course.entity.CourseMaterial;
import com.devpath.domain.course.entity.CourseObjective;
import com.devpath.domain.course.entity.CourseSection;
import com.devpath.domain.course.entity.CourseTagMap;
import com.devpath.domain.course.entity.CourseTargetAudience;
import com.devpath.domain.course.entity.Lesson;
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

// 강사용 강의 상세 조회 비즈니스 로직을 처리한다.
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class InstructorCourseQueryService {

    private final UserRepository userRepository;
    private final CourseRepository courseRepository;
    private final CourseSectionRepository courseSectionRepository;
    private final LessonRepository lessonRepository;
    private final CourseMaterialRepository courseMaterialRepository;
    private final CourseObjectiveRepository courseObjectiveRepository;
    private final CourseTargetAudienceRepository courseTargetAudienceRepository;
    private final CourseTagMapRepository courseTagMapRepository;
    private final UserProfileRepository userProfileRepository;
    private final UserTechStackRepository userTechStackRepository;

    // 현재 로그인한 강사의 강의 상세 정보를 조회한다.
    public CourseDetailResponse getCourseDetail(Long instructorId, Long courseId) {
        validateAuthenticatedUser(instructorId);

        Course course = getOwnedCourse(instructorId, courseId);

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
        return courseRepository.findByCourseIdAndInstructorId(courseId, instructorId)
                .orElseGet(() -> {
                    if (courseRepository.existsById(courseId)) {
                        throw new CustomException(ErrorCode.FORBIDDEN);
                    }
                    throw new CustomException(ErrorCode.RESOURCE_NOT_FOUND);
                });
    }

    // 강의 목표 엔티티 목록을 응답 DTO로 변환한다.
    private List<CourseDetailResponse.ObjectiveItem> mapObjectives(List<CourseObjective> objectives) {
        return objectives.stream()
                .map(objective -> CourseDetailResponse.ObjectiveItem.builder()
                        .objectiveId(objective.getObjectiveId())
                        .objectiveText(objective.getObjectiveText())
                        .displayOrder(objective.getDisplayOrder())
                        .build())
                .toList();
    }

    // 수강 대상 엔티티 목록을 응답 DTO로 변환한다.
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

    // 강의 태그 매핑 목록을 응답 DTO로 변환한다.
    private List<CourseDetailResponse.TagItem> mapTags(List<CourseTagMap> tagMaps) {
        return tagMaps.stream()
                .map(tagMap -> CourseDetailResponse.TagItem.builder()
                        .tagId(tagMap.getTag().getTagId())
                        .tagName(tagMap.getTag().getName())
                        .proficiencyLevel(tagMap.getProficiencyLevel())
                        .build())
                .toList();
    }

    // 강사 프로필과 기술 스택을 강사 정보 응답 DTO로 변환한다.
    private CourseDetailResponse.InstructorInfo mapInstructor(
            Course course,
            UserProfile userProfile,
            List<String> specialties
    ) {
        Long instructorId = course.getInstructorId();

        return CourseDetailResponse.InstructorInfo.builder()
                .instructorId(instructorId)
                .channelName(resolveChannelName(userProfile))
                .profileImage(userProfile == null ? null : userProfile.getProfileImage())
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

    // 레슨 엔티티 목록을 응답 DTO로 변환한다.
    private List<CourseDetailResponse.LessonItem> mapLessons(List<Lesson> lessons) {
        return lessons.stream()
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

    // 첨부 자료 엔티티 목록을 응답 DTO로 변환한다.
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
}
