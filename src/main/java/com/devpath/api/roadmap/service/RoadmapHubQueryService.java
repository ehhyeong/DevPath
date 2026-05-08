package com.devpath.api.roadmap.service;

import com.devpath.api.admin.dto.roadmaphub.AdminRoadmapHubCatalogResponse;
import com.devpath.api.roadmap.dto.RoadmapHubCatalogResponse;
import com.devpath.domain.roadmap.entity.Roadmap;
import com.devpath.domain.roadmap.entity.RoadmapHubItem;
import com.devpath.domain.roadmap.entity.RoadmapHubSection;
import com.devpath.domain.roadmap.repository.RoadmapHubItemRepository;
import com.devpath.domain.roadmap.repository.RoadmapHubSectionRepository;
import com.devpath.domain.roadmap.repository.RoadmapRepository;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// 로드맵 허브 공개 화면과 관리자 편집기에 필요한 카탈로그 응답을 조립한다.
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RoadmapHubQueryService {

  private final RoadmapHubSectionRepository roadmapHubSectionRepository;
  private final RoadmapHubItemRepository roadmapHubItemRepository;
  private final RoadmapRepository roadmapRepository;

  public RoadmapHubCatalogResponse getPublicCatalog() {
    return RoadmapHubCatalogResponse.builder().sections(loadSectionItems(false)).build();
  }

  public AdminRoadmapHubCatalogResponse getAdminCatalog() {
    return AdminRoadmapHubCatalogResponse.builder()
        .sections(loadSectionItems(true))
        .officialRoadmaps(loadOfficialRoadmapOptions())
        .build();
  }

  private List<RoadmapHubCatalogResponse.SectionItem> loadSectionItems(boolean includeInactive) {
    List<RoadmapHubSection> sections =
        roadmapHubSectionRepository.findAllByOrderBySortOrderAscIdAsc();
    List<RoadmapHubSection> visibleSections =
        includeInactive
            ? sections
            : sections.stream()
                .filter(section -> Boolean.TRUE.equals(section.getActive()))
                .toList();

    if (visibleSections.isEmpty()) {
      return List.of();
    }

    List<Long> sectionIds = visibleSections.stream().map(RoadmapHubSection::getId).toList();
    Map<Long, List<RoadmapHubItem>> itemsBySectionId =
        roadmapHubItemRepository
            .findAllBySectionIdInOrderBySectionIdAscSortOrderAscIdAsc(sectionIds)
            .stream()
            .collect(
                Collectors.groupingBy(
                    item -> item.getSection().getId(), LinkedHashMap::new, Collectors.toList()));

    return visibleSections.stream()
        .map(
            section ->
                mapSection(
                    section,
                    itemsBySectionId.getOrDefault(section.getId(), List.of()),
                    includeInactive))
        .toList();
  }

  private RoadmapHubCatalogResponse.SectionItem mapSection(
      RoadmapHubSection section, List<RoadmapHubItem> items, boolean includeInactive) {
    return RoadmapHubCatalogResponse.SectionItem.builder()
        .sectionKey(section.getSectionKey())
        .title(section.getTitle())
        .description(section.getDescription())
        .layoutType(section.getLayoutType())
        .sortOrder(section.getSortOrder())
        .active(section.getActive())
        .items(
            items.stream()
                .filter(item -> includeInactive || Boolean.TRUE.equals(item.getActive()))
                .map(this::mapItem)
                .toList())
        .build();
  }

  private RoadmapHubCatalogResponse.Item mapItem(RoadmapHubItem item) {
    Roadmap linkedRoadmap = item.getLinkedRoadmap();

    return RoadmapHubCatalogResponse.Item.builder()
        .title(item.getTitle())
        .subtitle(item.getSubtitle())
        .iconClass(item.getIconClass())
        .iconColor(item.getIconColor())
        .sortOrder(item.getSortOrder())
        .active(item.getActive())
        .featured(item.getFeatured())
        .linkedRoadmapId(linkedRoadmap == null ? null : linkedRoadmap.getRoadmapId())
        .linkedRoadmapTitle(linkedRoadmap == null ? null : linkedRoadmap.getTitle())
        .build();
  }

  private List<AdminRoadmapHubCatalogResponse.OfficialRoadmapOption> loadOfficialRoadmapOptions() {
    return roadmapRepository.findAllByIsOfficialTrueAndIsDeletedFalseOrderByTitleAsc().stream()
        .map(
            roadmap ->
                AdminRoadmapHubCatalogResponse.OfficialRoadmapOption.builder()
                    .roadmapId(roadmap.getRoadmapId())
                    .title(roadmap.getTitle())
                    .build())
        .toList();
  }
}
