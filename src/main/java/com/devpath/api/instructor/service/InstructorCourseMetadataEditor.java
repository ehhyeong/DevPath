package com.devpath.api.instructor.service;

import com.devpath.api.instructor.dto.InstructorCourseDto;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.course.entity.Course;
import com.devpath.domain.course.entity.CourseInfoSectionItem;
import com.devpath.domain.course.entity.CourseObjective;
import com.devpath.domain.course.entity.CourseTagMap;
import com.devpath.domain.course.entity.CourseTargetAudience;
import com.devpath.domain.course.repository.CourseInfoSectionItemRepository;
import com.devpath.domain.course.repository.CourseObjectiveRepository;
import com.devpath.domain.course.repository.CourseTagMapRepository;
import com.devpath.domain.course.repository.CourseTargetAudienceRepository;
import com.devpath.domain.user.entity.Tag;
import com.devpath.domain.user.repository.TagRepository;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
class InstructorCourseMetadataEditor {

  private static final String INFO_SECTION_TARGET_AUDIENCE = "TARGET_AUDIENCE";
  private static final String INFO_SECTION_PREREQUISITES = "PREREQUISITES";
  private static final String INFO_SECTION_OBJECTIVES = "OBJECTIVES";

  private final TagRepository tagRepository;
  private final CourseInfoSectionItemRepository courseInfoSectionItemRepository;
  private final CourseObjectiveRepository courseObjectiveRepository;
  private final CourseTargetAudienceRepository courseTargetAudienceRepository;
  private final CourseTagMapRepository courseTagMapRepository;

  void updateMetadata(Course course, InstructorCourseDto.UpdateMetadataRequest request) {
    course.replacePrerequisites(request.getPrerequisites());
    course.replaceJobRelevance(request.getJobRelevance());
    replaceCourseTags(course, request.getTagIds());
  }

  void replaceObjectives(Course course, List<String> objectives) {
    replaceObjectiveEntities(course, objectives);
  }

  void replaceTargetAudiences(Course course, List<String> targetAudiences) {
    replaceTargetAudienceEntities(course, targetAudiences);
  }

  void replaceInfoSections(Course course, InstructorCourseDto.ReplaceInfoSectionsRequest request) {
    courseInfoSectionItemRepository.deleteAllByCourseCourseId(course.getCourseId());

    List<CourseInfoSectionItem> infoItems = new ArrayList<>();
    List<String> targetAudiences = List.of();
    List<String> prerequisites = List.of();
    List<String> objectives = List.of();

    for (int sectionIndex = 0; sectionIndex < request.getSections().size(); sectionIndex++) {
      InstructorCourseDto.InfoSectionRequest section = request.getSections().get(sectionIndex);
      String title = section.getTitle().trim();
      String sectionKey = normalizeInfoSectionKey(section.getSectionKey(), sectionIndex);
      List<String> items =
          section.getItems().stream().map(String::trim).filter(item -> !item.isBlank()).toList();

      if (INFO_SECTION_TARGET_AUDIENCE.equals(sectionKey)) {
        targetAudiences = items;
      } else if (INFO_SECTION_PREREQUISITES.equals(sectionKey)) {
        prerequisites = items;
      } else if (INFO_SECTION_OBJECTIVES.equals(sectionKey)) {
        objectives = items;
      }

      for (int itemIndex = 0; itemIndex < items.size(); itemIndex++) {
        infoItems.add(
            CourseInfoSectionItem.builder()
                .course(course)
                .sectionKey(sectionKey)
                .sectionTitle(title)
                .sectionOrder(sectionIndex)
                .itemText(items.get(itemIndex))
                .itemOrder(itemIndex)
                .build());
      }
    }

    courseInfoSectionItemRepository.saveAll(infoItems);
    course.replacePrerequisites(prerequisites);
    replaceObjectiveEntities(course, objectives);
    replaceTargetAudienceEntities(course, targetAudiences);
  }

  void replaceCourseTags(Course course, List<Long> tagIds) {
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

  void deleteAll(Long courseId) {
    courseInfoSectionItemRepository.deleteAllByCourseCourseId(courseId);
    courseObjectiveRepository.deleteAllByCourseCourseId(courseId);
    courseTargetAudienceRepository.deleteAllByCourseCourseId(courseId);
    courseTagMapRepository.deleteAllByCourseCourseId(courseId);
  }

  private String normalizeInfoSectionKey(String sectionKey, int sectionIndex) {
    if (sectionKey == null || sectionKey.isBlank()) {
      return "CUSTOM_" + sectionIndex;
    }
    return sectionKey.trim().toUpperCase(Locale.ROOT);
  }

  private void replaceObjectiveEntities(Course course, List<String> objectives) {
    courseObjectiveRepository.deleteAllByCourseCourseId(course.getCourseId());

    List<CourseObjective> objectiveEntities = new ArrayList<>();
    for (int index = 0; index < objectives.size(); index++) {
      objectiveEntities.add(
          CourseObjective.builder()
              .course(course)
              .objectiveText(objectives.get(index))
              .displayOrder(index)
              .build());
    }
    courseObjectiveRepository.saveAll(objectiveEntities);
  }

  private void replaceTargetAudienceEntities(Course course, List<String> targetAudiences) {
    courseTargetAudienceRepository.deleteAllByCourseCourseId(course.getCourseId());

    List<CourseTargetAudience> targetAudienceEntities = new ArrayList<>();
    for (int index = 0; index < targetAudiences.size(); index++) {
      targetAudienceEntities.add(
          CourseTargetAudience.builder()
              .course(course)
              .audienceDescription(targetAudiences.get(index))
              .displayOrder(index)
              .build());
    }
    courseTargetAudienceRepository.saveAll(targetAudienceEntities);
  }
}
