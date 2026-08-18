package com.devpath.api.common.service;

import com.devpath.api.common.dto.CourseDetailResponse;
import com.devpath.domain.course.entity.Course;
import com.devpath.domain.course.entity.CourseInfoSectionItem;
import com.devpath.domain.course.entity.CourseObjective;
import com.devpath.domain.course.entity.CourseTagMap;
import com.devpath.domain.course.entity.CourseTargetAudience;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

@Component
public class CourseDetailMetadataMapper {

  private static final String TARGET_AUDIENCE = "TARGET_AUDIENCE";
  private static final String PREREQUISITES = "PREREQUISITES";
  private static final String OBJECTIVES = "OBJECTIVES";

  public List<CourseDetailResponse.ObjectiveItem> mapObjectives(List<CourseObjective> objectives) {
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

  public List<CourseDetailResponse.TargetAudienceItem> mapTargetAudiences(
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

  public List<CourseDetailResponse.InfoSectionItem> mapInfoSections(
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
              .sectionKey(TARGET_AUDIENCE)
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
              .sectionKey(PREREQUISITES)
              .title("수강 전 알아두면 좋아요")
              .displayOrder(fallback.size())
              .items(course.getPrerequisites())
              .build());
    }
    if (!objectives.isEmpty()) {
      fallback.add(
          CourseDetailResponse.InfoSectionItem.builder()
              .sectionKey(OBJECTIVES)
              .title("이 강의를 듣고 나면")
              .displayOrder(fallback.size())
              .items(objectives.stream().map(CourseObjective::getObjectiveText).toList())
              .build());
    }
    return fallback;
  }

  public List<CourseDetailResponse.TagItem> mapTags(List<CourseTagMap> tagMaps) {
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
}
