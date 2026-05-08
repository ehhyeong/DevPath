package com.devpath.api.admin.service;

import com.devpath.api.admin.dto.catalog.LectureCatalogMenuUpdateRequest;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.course.entity.LectureCatalogCategory;
import com.devpath.domain.course.entity.LectureCatalogGroup;
import com.devpath.domain.course.entity.LectureCatalogGroupItem;
import com.devpath.domain.course.entity.LectureCatalogMegaMenuItem;
import com.devpath.domain.course.repository.LectureCatalogCategoryRepository;
import com.devpath.domain.course.repository.LectureCatalogGroupItemRepository;
import com.devpath.domain.course.repository.LectureCatalogGroupRepository;
import com.devpath.domain.course.repository.LectureCatalogMegaMenuItemRepository;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// 관리자 메뉴 편집 화면의 저장 요청을 현재 메뉴 구성으로 반영한다.
@Service
@RequiredArgsConstructor
@Transactional
public class AdminLectureCatalogService {

  private final LectureCatalogCategoryRepository lectureCatalogCategoryRepository;
  private final LectureCatalogMegaMenuItemRepository lectureCatalogMegaMenuItemRepository;
  private final LectureCatalogGroupRepository lectureCatalogGroupRepository;
  private final LectureCatalogGroupItemRepository lectureCatalogGroupItemRepository;

  public void replaceMenu(LectureCatalogMenuUpdateRequest request) {
    List<LectureCatalogMenuUpdateRequest.CategoryRequest> requestedCategories =
        request == null ? null : request.getCategories();
    if (requestedCategories == null || requestedCategories.isEmpty()) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }

    Set<String> categoryKeys = new LinkedHashSet<>();
    for (LectureCatalogMenuUpdateRequest.CategoryRequest categoryRequest : requestedCategories) {
      String categoryKey =
          normalizeCategoryKey(categoryRequest == null ? null : categoryRequest.getCategoryKey());
      if (!categoryKeys.add(categoryKey)) {
        throw new CustomException(ErrorCode.INVALID_INPUT);
      }
    }

    lectureCatalogGroupItemRepository.deleteAllInBatch();
    lectureCatalogGroupRepository.deleteAllInBatch();
    lectureCatalogMegaMenuItemRepository.deleteAllInBatch();
    lectureCatalogCategoryRepository.deleteAllInBatch();

    for (int categoryIndex = 0; categoryIndex < requestedCategories.size(); categoryIndex += 1) {
      LectureCatalogMenuUpdateRequest.CategoryRequest categoryRequest =
          requestedCategories.get(categoryIndex);
      LectureCatalogCategory savedCategory =
          lectureCatalogCategoryRepository.save(
              LectureCatalogCategory.builder()
                  .categoryKey(normalizeCategoryKey(categoryRequest.getCategoryKey()))
                  .label(normalizeRequiredValue(categoryRequest.getLabel()))
                  .title(
                      normalizeOptionalValue(
                          categoryRequest.getTitle(),
                          normalizeRequiredValue(categoryRequest.getLabel())))
                  .iconClass(
                      normalizeOptionalValue(categoryRequest.getIconClass(), "fas fa-folder"))
                  .sortOrder(normalizeSortOrder(categoryRequest.getSortOrder(), categoryIndex))
                  .active(categoryRequest.getActive() == null || categoryRequest.getActive())
                  .build());

      saveMegaMenuItems(savedCategory, categoryRequest.getMegaMenuItems());
      saveGroups(savedCategory, categoryRequest.getGroups(), categoryKeys);
    }
  }

  private void saveMegaMenuItems(
      LectureCatalogCategory category,
      List<LectureCatalogMenuUpdateRequest.MegaMenuItemRequest> megaMenuItems) {
    if (megaMenuItems == null || megaMenuItems.isEmpty()) {
      return;
    }

    for (int itemIndex = 0; itemIndex < megaMenuItems.size(); itemIndex += 1) {
      LectureCatalogMenuUpdateRequest.MegaMenuItemRequest itemRequest =
          megaMenuItems.get(itemIndex);
      lectureCatalogMegaMenuItemRepository.save(
          LectureCatalogMegaMenuItem.builder()
              .category(category)
              .label(normalizeRequiredValue(itemRequest == null ? null : itemRequest.getLabel()))
              .sortOrder(
                  normalizeSortOrder(
                      itemRequest == null ? null : itemRequest.getSortOrder(), itemIndex))
              .build());
    }
  }

  private void saveGroups(
      LectureCatalogCategory category,
      List<LectureCatalogMenuUpdateRequest.GroupRequest> groups,
      Set<String> categoryKeys) {
    if (groups == null || groups.isEmpty()) {
      return;
    }

    for (int groupIndex = 0; groupIndex < groups.size(); groupIndex += 1) {
      LectureCatalogMenuUpdateRequest.GroupRequest groupRequest = groups.get(groupIndex);
      LectureCatalogGroup savedGroup =
          lectureCatalogGroupRepository.save(
              LectureCatalogGroup.builder()
                  .category(category)
                  .name(
                      normalizeRequiredValue(groupRequest == null ? null : groupRequest.getName()))
                  .sortOrder(
                      normalizeSortOrder(
                          groupRequest == null ? null : groupRequest.getSortOrder(), groupIndex))
                  .build());

      saveGroupItems(
          savedGroup, groupRequest == null ? null : groupRequest.getItems(), categoryKeys);
    }
  }

  private void saveGroupItems(
      LectureCatalogGroup group,
      List<LectureCatalogMenuUpdateRequest.GroupItemRequest> items,
      Set<String> categoryKeys) {
    if (items == null || items.isEmpty()) {
      return;
    }

    for (int itemIndex = 0; itemIndex < items.size(); itemIndex += 1) {
      LectureCatalogMenuUpdateRequest.GroupItemRequest itemRequest = items.get(itemIndex);
      String linkedCategoryKey =
          normalizeLinkedCategoryKey(
              itemRequest == null ? null : itemRequest.getLinkedCategoryKey(), categoryKeys);

      lectureCatalogGroupItemRepository.save(
          LectureCatalogGroupItem.builder()
              .group(group)
              .name(normalizeRequiredValue(itemRequest == null ? null : itemRequest.getName()))
              .linkedCategoryKey(linkedCategoryKey)
              .sortOrder(
                  normalizeSortOrder(
                      itemRequest == null ? null : itemRequest.getSortOrder(), itemIndex))
              .build());
    }
  }

  private String normalizeRequiredValue(String value) {
    if (value == null || value.isBlank()) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }

    return value.trim();
  }

  private String normalizeOptionalValue(String value, String fallbackValue) {
    if (value == null || value.isBlank()) {
      return fallbackValue;
    }

    return value.trim();
  }

  private String normalizeCategoryKey(String value) {
    if (value == null || value.isBlank()) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }

    return value.trim().toLowerCase(Locale.ROOT);
  }

  private String normalizeLinkedCategoryKey(String value, Set<String> categoryKeys) {
    if (value == null || value.isBlank()) {
      return null;
    }

    String normalizedValue = value.trim().toLowerCase(Locale.ROOT);
    if (!categoryKeys.contains(normalizedValue)) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }

    return normalizedValue;
  }

  private int normalizeSortOrder(Integer value, int fallbackValue) {
    return value == null ? fallbackValue : value;
  }
}
