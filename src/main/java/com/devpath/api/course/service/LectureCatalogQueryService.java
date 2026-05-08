package com.devpath.api.course.service;

import com.devpath.api.course.dto.LectureCatalogMenuResponse;
import com.devpath.domain.course.entity.LectureCatalogCategory;
import com.devpath.domain.course.entity.LectureCatalogGroup;
import com.devpath.domain.course.entity.LectureCatalogGroupItem;
import com.devpath.domain.course.entity.LectureCatalogMegaMenuItem;
import com.devpath.domain.course.repository.LectureCatalogCategoryRepository;
import com.devpath.domain.course.repository.LectureCatalogGroupItemRepository;
import com.devpath.domain.course.repository.LectureCatalogGroupRepository;
import com.devpath.domain.course.repository.LectureCatalogMegaMenuItemRepository;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// 강의 목록 화면과 관리자 화면에 필요한 메뉴 설정을 조립한다.
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LectureCatalogQueryService {

  private final LectureCatalogCategoryRepository lectureCatalogCategoryRepository;
  private final LectureCatalogMegaMenuItemRepository lectureCatalogMegaMenuItemRepository;
  private final LectureCatalogGroupRepository lectureCatalogGroupRepository;
  private final LectureCatalogGroupItemRepository lectureCatalogGroupItemRepository;

  public LectureCatalogMenuResponse getPublicMenu() {
    return buildMenu(false);
  }

  public LectureCatalogMenuResponse getAdminMenu() {
    return buildMenu(true);
  }

  private LectureCatalogMenuResponse buildMenu(boolean includeInactive) {
    List<LectureCatalogCategory> categories =
        lectureCatalogCategoryRepository.findAllByOrderBySortOrderAscIdAsc();
    List<LectureCatalogCategory> visibleCategories =
        includeInactive
            ? categories
            : categories.stream()
                .filter(category -> Boolean.TRUE.equals(category.getActive()))
                .toList();

    if (visibleCategories.isEmpty()) {
      return LectureCatalogMenuResponse.builder().categories(List.of()).build();
    }

    List<Long> categoryIds = visibleCategories.stream().map(LectureCatalogCategory::getId).toList();
    Map<Long, List<LectureCatalogMegaMenuItem>> megaMenuItemsByCategoryId =
        lectureCatalogMegaMenuItemRepository
            .findAllByCategoryIdInOrderByCategoryIdAscSortOrderAscIdAsc(categoryIds)
            .stream()
            .collect(
                Collectors.groupingBy(
                    item -> item.getCategory().getId(), LinkedHashMap::new, Collectors.toList()));
    List<LectureCatalogGroup> groups =
        lectureCatalogGroupRepository.findAllByCategoryIdInOrderByCategoryIdAscSortOrderAscIdAsc(
            categoryIds);
    List<Long> groupIds = groups.stream().map(LectureCatalogGroup::getId).toList();
    Map<Long, List<LectureCatalogGroupItem>> itemsByGroupId =
        groupIds.isEmpty()
            ? Map.of()
            : lectureCatalogGroupItemRepository
                .findAllByGroupIdInOrderByGroupIdAscSortOrderAscIdAsc(groupIds)
                .stream()
                .collect(
                    Collectors.groupingBy(
                        item -> item.getGroup().getId(), LinkedHashMap::new, Collectors.toList()));
    Map<Long, List<LectureCatalogGroup>> groupsByCategoryId =
        groups.stream()
            .collect(
                Collectors.groupingBy(
                    group -> group.getCategory().getId(), LinkedHashMap::new, Collectors.toList()));
    Set<String> visibleCategoryKeys =
        visibleCategories.stream()
            .map(LectureCatalogCategory::getCategoryKey)
            .collect(Collectors.toSet());

    return LectureCatalogMenuResponse.builder()
        .categories(
            visibleCategories.stream()
                .map(
                    category ->
                        mapCategory(
                            category,
                            megaMenuItemsByCategoryId.getOrDefault(category.getId(), List.of()),
                            groupsByCategoryId.getOrDefault(category.getId(), List.of()),
                            itemsByGroupId,
                            visibleCategoryKeys,
                            includeInactive))
                .toList())
        .build();
  }

  private LectureCatalogMenuResponse.CategoryItem mapCategory(
      LectureCatalogCategory category,
      List<LectureCatalogMegaMenuItem> megaMenuItems,
      List<LectureCatalogGroup> groups,
      Map<Long, List<LectureCatalogGroupItem>> itemsByGroupId,
      Set<String> visibleCategoryKeys,
      boolean includeInactive) {
    return LectureCatalogMenuResponse.CategoryItem.builder()
        .categoryKey(category.getCategoryKey())
        .label(category.getLabel())
        .title(category.getTitle())
        .iconClass(category.getIconClass())
        .sortOrder(category.getSortOrder())
        .active(category.getActive())
        .megaMenuItems(
            megaMenuItems.stream()
                .map(
                    item ->
                        LectureCatalogMenuResponse.MegaMenuItem.builder()
                            .label(item.getLabel())
                            .sortOrder(item.getSortOrder())
                            .build())
                .toList())
        .groups(
            groups.stream()
                .map(
                    group ->
                        mapGroup(
                            group,
                            itemsByGroupId.getOrDefault(group.getId(), List.of()),
                            visibleCategoryKeys,
                            includeInactive))
                .toList())
        .build();
  }

  private LectureCatalogMenuResponse.GroupItem mapGroup(
      LectureCatalogGroup group,
      List<LectureCatalogGroupItem> items,
      Set<String> visibleCategoryKeys,
      boolean includeInactive) {
    return LectureCatalogMenuResponse.GroupItem.builder()
        .name(group.getName())
        .sortOrder(group.getSortOrder())
        .items(
            items.stream()
                .filter(item -> includeInactive || isVisibleItem(item, visibleCategoryKeys))
                .map(this::mapGroupItem)
                .toList())
        .build();
  }

  private boolean isVisibleItem(
      LectureCatalogGroupItem item, Collection<String> visibleCategoryKeys) {
    if (item.getLinkedCategoryKey() == null || item.getLinkedCategoryKey().isBlank()) {
      return true;
    }

    return visibleCategoryKeys.contains(item.getLinkedCategoryKey());
  }

  private LectureCatalogMenuResponse.GroupTagItem mapGroupItem(LectureCatalogGroupItem item) {
    return LectureCatalogMenuResponse.GroupTagItem.builder()
        .name(item.getName())
        .linkedCategoryKey(item.getLinkedCategoryKey())
        .sortOrder(item.getSortOrder())
        .build();
  }
}
