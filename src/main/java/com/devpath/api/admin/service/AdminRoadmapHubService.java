package com.devpath.api.admin.service;

import com.devpath.api.admin.dto.roadmaphub.RoadmapHubCatalogUpdateRequest;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.roadmap.entity.Roadmap;
import com.devpath.domain.roadmap.entity.RoadmapHubItem;
import com.devpath.domain.roadmap.entity.RoadmapHubSection;
import com.devpath.domain.roadmap.repository.RoadmapHubItemRepository;
import com.devpath.domain.roadmap.repository.RoadmapHubSectionRepository;
import com.devpath.domain.roadmap.repository.RoadmapRepository;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// 관리자 허브 편집기에서 보낸 전체 구조를 현재 로드맵 허브 구성으로 교체한다.
@Service
@RequiredArgsConstructor
@Transactional
public class AdminRoadmapHubService {

  private static final Set<String> SUPPORTED_LAYOUT_TYPES =
      Set.of("CARD_GRID", "CHIP_GRID", "LINK_LIST");
  private static final Pattern HEX_COLOR_PATTERN = Pattern.compile("^#[0-9a-fA-F]{6}$");

  private final RoadmapHubSectionRepository roadmapHubSectionRepository;
  private final RoadmapHubItemRepository roadmapHubItemRepository;
  private final RoadmapRepository roadmapRepository;

  public void replaceCatalog(RoadmapHubCatalogUpdateRequest request) {
    List<RoadmapHubCatalogUpdateRequest.SectionRequest> requestedSections =
        request == null ? null : request.getSections();
    if (requestedSections == null || requestedSections.isEmpty()) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }

    Set<String> sectionKeys = new LinkedHashSet<>();
    for (RoadmapHubCatalogUpdateRequest.SectionRequest sectionRequest : requestedSections) {
      String sectionKey =
          normalizeSectionKey(sectionRequest == null ? null : sectionRequest.getSectionKey());
      if (!sectionKeys.add(sectionKey)) {
        throw new CustomException(ErrorCode.INVALID_INPUT);
      }
    }

    roadmapHubItemRepository.deleteAllInBatch();
    roadmapHubSectionRepository.deleteAllInBatch();

    for (int sectionIndex = 0; sectionIndex < requestedSections.size(); sectionIndex += 1) {
      RoadmapHubCatalogUpdateRequest.SectionRequest sectionRequest =
          requestedSections.get(sectionIndex);
      RoadmapHubSection savedSection =
          roadmapHubSectionRepository.save(
              RoadmapHubSection.builder()
                  .sectionKey(normalizeSectionKey(sectionRequest.getSectionKey()))
                  .title(normalizeRequiredValue(sectionRequest.getTitle()))
                  .description(normalizeOptionalValue(sectionRequest.getDescription()))
                  .layoutType(normalizeLayoutType(sectionRequest.getLayoutType()))
                  .sortOrder(normalizeSortOrder(sectionRequest.getSortOrder(), sectionIndex))
                  .active(sectionRequest.getActive() == null || sectionRequest.getActive())
                  .build());

      saveItems(savedSection, sectionRequest.getItems());
    }
  }

  private void saveItems(
      RoadmapHubSection section, List<RoadmapHubCatalogUpdateRequest.ItemRequest> items) {
    if (items == null || items.isEmpty()) {
      return;
    }

    for (int itemIndex = 0; itemIndex < items.size(); itemIndex += 1) {
      RoadmapHubCatalogUpdateRequest.ItemRequest itemRequest = items.get(itemIndex);
      Roadmap linkedRoadmap =
          resolveLinkedRoadmap(itemRequest == null ? null : itemRequest.getLinkedRoadmapId());

      roadmapHubItemRepository.save(
          RoadmapHubItem.builder()
              .section(section)
              .title(normalizeRequiredValue(itemRequest == null ? null : itemRequest.getTitle()))
              .subtitle(
                  normalizeOptionalValue(itemRequest == null ? null : itemRequest.getSubtitle()))
              .iconClass(
                  normalizeOptionalValue(itemRequest == null ? null : itemRequest.getIconClass()))
              .iconColor(
                  normalizeColorValue(itemRequest == null ? null : itemRequest.getIconColor()))
              .sortOrder(
                  normalizeSortOrder(
                      itemRequest == null ? null : itemRequest.getSortOrder(), itemIndex))
              .active(
                  itemRequest == null || itemRequest.getActive() == null || itemRequest.getActive())
              .featured(itemRequest != null && Boolean.TRUE.equals(itemRequest.getFeatured()))
              .linkedRoadmap(linkedRoadmap)
              .build());
    }
  }

  private Roadmap resolveLinkedRoadmap(Long linkedRoadmapId) {
    if (linkedRoadmapId == null) {
      return null;
    }

    return roadmapRepository
        .findByRoadmapIdAndIsOfficialTrueAndIsDeletedFalse(linkedRoadmapId)
        .orElseThrow(() -> new CustomException(ErrorCode.ROADMAP_NOT_FOUND));
  }

  private String normalizeSectionKey(String value) {
    if (value == null || value.isBlank()) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }

    return value.trim().toLowerCase(Locale.ROOT);
  }

  private String normalizeRequiredValue(String value) {
    if (value == null || value.isBlank()) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }

    return value.trim();
  }

  private String normalizeOptionalValue(String value) {
    if (value == null || value.isBlank()) {
      return null;
    }

    return value.trim();
  }

  private String normalizeColorValue(String value) {
    String normalized = normalizeOptionalValue(value);
    if (normalized == null) {
      return null;
    }

    if (!HEX_COLOR_PATTERN.matcher(normalized).matches()) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }

    return normalized.toUpperCase(Locale.ROOT);
  }

  private String normalizeLayoutType(String value) {
    if (value == null || value.isBlank()) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }

    String normalized = value.trim().toUpperCase(Locale.ROOT);
    if (!SUPPORTED_LAYOUT_TYPES.contains(normalized)) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }

    return normalized;
  }

  private int normalizeSortOrder(Integer value, int fallbackValue) {
    return value == null ? fallbackValue : value;
  }
}
