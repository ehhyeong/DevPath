package com.devpath.api.admin.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.devpath.api.admin.dto.catalog.LectureCatalogMenuUpdateRequest;
import com.devpath.api.course.dto.LectureCatalogMenuResponse;
import com.devpath.api.course.service.LectureCatalogQueryService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;
import org.springframework.test.util.ReflectionTestUtils;

@DataJpaTest(
    properties = {
      "spring.jpa.hibernate.ddl-auto=create-drop",
      "spring.sql.init.mode=never",
      "spring.jpa.defer-datasource-initialization=false"
    })
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.ANY)
@Import({AdminLectureCatalogService.class, LectureCatalogQueryService.class})
// 강의 목록 메뉴 저장과 공개 메뉴 필터링이 JPA 기준으로 동작하는지 검증한다.
class AdminLectureCatalogServiceIntegrationTest {

  @Autowired private AdminLectureCatalogService adminLectureCatalogService;
  @Autowired private LectureCatalogQueryService lectureCatalogQueryService;

  @Test
  @DisplayName("강의 메뉴 전체 저장은 중첩 구조를 유지하고 기존 구성을 교체한다")
  // 전체 저장 이후 관리자 메뉴 조회가 새 카테고리 구조만 그대로 반환하는지 확인한다.
  void replaceMenuPersistsNestedStructureAndReplacesExistingMenu() {
    adminLectureCatalogService.replaceMenu(
        request(
            category(
                "all",
                "전체",
                "전체 강의",
                "fas fa-th-large",
                true,
                0,
                group("탐색 분야", 0, groupItem("웹 개발", "dev", 0))),
            category(
                "dev",
                "개발",
                "개발 · 프로그래밍",
                "fas fa-laptop-code",
                true,
                1,
                megaMenuItem("백엔드", 0),
                group("백엔드", 0, groupItem("Spring Boot", null, 0)))));

    LectureCatalogMenuResponse firstResponse = lectureCatalogQueryService.getAdminMenu();

    assertThat(firstResponse.getCategories()).hasSize(2);
    assertThat(firstResponse.getCategories().get(0).getCategoryKey()).isEqualTo("all");
    assertThat(
            firstResponse
                .getCategories()
                .get(0)
                .getGroups()
                .get(0)
                .getItems()
                .get(0)
                .getLinkedCategoryKey())
        .isEqualTo("dev");
    assertThat(firstResponse.getCategories().get(1).getMegaMenuItems())
        .extracting(LectureCatalogMenuResponse.MegaMenuItem::getLabel)
        .containsExactly("백엔드");

    adminLectureCatalogService.replaceMenu(
        request(
            category(
                "all",
                "전체",
                "통합 강의",
                "fas fa-th-large",
                true,
                0,
                group("탐색 분야", 0, groupItem("데이터 분석", null, 0)))));

    LectureCatalogMenuResponse replacedResponse = lectureCatalogQueryService.getAdminMenu();

    assertThat(replacedResponse.getCategories()).hasSize(1);
    assertThat(replacedResponse.getCategories().get(0).getTitle()).isEqualTo("통합 강의");
    assertThat(replacedResponse.getCategories().get(0).getGroups().get(0).getItems())
        .extracting(LectureCatalogMenuResponse.GroupTagItem::getName)
        .containsExactly("데이터 분석");
  }

  @Test
  @DisplayName("공개 메뉴 조회는 비활성 카테고리와 해당 연결 항목을 숨긴다")
  // 전체 메뉴에는 남아 있어도 공개 메뉴에서는 노출 대상만 남는지 확인한다.
  void getPublicMenuFiltersInactiveCategoryAndLinkedItems() {
    adminLectureCatalogService.replaceMenu(
        request(
            category(
                "all",
                "전체",
                "전체 강의",
                "fas fa-th-large",
                true,
                0,
                group("탐색 분야", 0, groupItem("웹 개발", "dev", 0), groupItem("직접 선택", null, 1))),
            category(
                "dev",
                "개발",
                "개발 · 프로그래밍",
                "fas fa-laptop-code",
                false,
                1,
                megaMenuItem("프론트엔드", 0),
                group("프론트엔드", 0, groupItem("React", null, 0)))));

    LectureCatalogMenuResponse adminMenu = lectureCatalogQueryService.getAdminMenu();
    LectureCatalogMenuResponse publicMenu = lectureCatalogQueryService.getPublicMenu();

    assertThat(adminMenu.getCategories()).hasSize(2);
    assertThat(publicMenu.getCategories()).hasSize(1);
    assertThat(publicMenu.getCategories().get(0).getCategoryKey()).isEqualTo("all");
    assertThat(publicMenu.getCategories().get(0).getGroups().get(0).getItems())
        .extracting(LectureCatalogMenuResponse.GroupTagItem::getName)
        .containsExactly("직접 선택");
  }

  private LectureCatalogMenuUpdateRequest request(
      LectureCatalogMenuUpdateRequest.CategoryRequest... categories) {
    LectureCatalogMenuUpdateRequest request = new LectureCatalogMenuUpdateRequest();
    ReflectionTestUtils.setField(request, "categories", java.util.List.of(categories));
    return request;
  }

  private LectureCatalogMenuUpdateRequest.CategoryRequest category(
      String categoryKey,
      String label,
      String title,
      String iconClass,
      boolean active,
      int sortOrder,
      Object... children) {
    LectureCatalogMenuUpdateRequest.CategoryRequest request =
        new LectureCatalogMenuUpdateRequest.CategoryRequest();
    ReflectionTestUtils.setField(request, "categoryKey", categoryKey);
    ReflectionTestUtils.setField(request, "label", label);
    ReflectionTestUtils.setField(request, "title", title);
    ReflectionTestUtils.setField(request, "iconClass", iconClass);
    ReflectionTestUtils.setField(request, "active", active);
    ReflectionTestUtils.setField(request, "sortOrder", sortOrder);
    ReflectionTestUtils.setField(
        request,
        "megaMenuItems",
        java.util.Arrays.stream(children)
            .filter(LectureCatalogMenuUpdateRequest.MegaMenuItemRequest.class::isInstance)
            .map(LectureCatalogMenuUpdateRequest.MegaMenuItemRequest.class::cast)
            .toList());
    ReflectionTestUtils.setField(
        request,
        "groups",
        java.util.Arrays.stream(children)
            .filter(LectureCatalogMenuUpdateRequest.GroupRequest.class::isInstance)
            .map(LectureCatalogMenuUpdateRequest.GroupRequest.class::cast)
            .toList());
    return request;
  }

  private LectureCatalogMenuUpdateRequest.MegaMenuItemRequest megaMenuItem(
      String label, int sortOrder) {
    LectureCatalogMenuUpdateRequest.MegaMenuItemRequest request =
        new LectureCatalogMenuUpdateRequest.MegaMenuItemRequest();
    ReflectionTestUtils.setField(request, "label", label);
    ReflectionTestUtils.setField(request, "sortOrder", sortOrder);
    return request;
  }

  private LectureCatalogMenuUpdateRequest.GroupRequest group(
      String name, int sortOrder, LectureCatalogMenuUpdateRequest.GroupItemRequest... items) {
    LectureCatalogMenuUpdateRequest.GroupRequest request =
        new LectureCatalogMenuUpdateRequest.GroupRequest();
    ReflectionTestUtils.setField(request, "name", name);
    ReflectionTestUtils.setField(request, "sortOrder", sortOrder);
    ReflectionTestUtils.setField(request, "items", java.util.List.of(items));
    return request;
  }

  private LectureCatalogMenuUpdateRequest.GroupItemRequest groupItem(
      String name, String linkedCategoryKey, int sortOrder) {
    LectureCatalogMenuUpdateRequest.GroupItemRequest request =
        new LectureCatalogMenuUpdateRequest.GroupItemRequest();
    ReflectionTestUtils.setField(request, "name", name);
    ReflectionTestUtils.setField(request, "linkedCategoryKey", linkedCategoryKey);
    ReflectionTestUtils.setField(request, "sortOrder", sortOrder);
    return request;
  }
}
