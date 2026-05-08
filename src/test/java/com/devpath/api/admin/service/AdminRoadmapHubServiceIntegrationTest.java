package com.devpath.api.admin.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.devpath.api.admin.dto.roadmaphub.AdminRoadmapHubCatalogResponse;
import com.devpath.api.admin.dto.roadmaphub.RoadmapHubCatalogUpdateRequest;
import com.devpath.api.roadmap.dto.RoadmapHubCatalogResponse;
import com.devpath.api.roadmap.service.RoadmapHubQueryService;
import com.devpath.domain.roadmap.entity.Roadmap;
import com.devpath.domain.roadmap.repository.RoadmapRepository;
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
@Import({AdminRoadmapHubService.class, RoadmapHubQueryService.class})
// 로드맵 허브 전체 저장과 공개 노출 필터가 JPA 기준으로 동작하는지 검증한다.
class AdminRoadmapHubServiceIntegrationTest {

  @Autowired private AdminRoadmapHubService adminRoadmapHubService;
  @Autowired private RoadmapHubQueryService roadmapHubQueryService;
  @Autowired private RoadmapRepository roadmapRepository;

  @Test
  @DisplayName("로드맵 허브 전체 저장 후 관리자 조회에서 섹션과 연결 로드맵 정보를 다시 읽어온다")
  // 관리자 편집기 저장 이후 중첩 구조와 공식 로드맵 선택 목록이 유지되는지 확인한다.
  void replaceCatalogPersistsSectionsAndLinkedRoadmaps() {
    Roadmap backendRoadmap = saveOfficialRoadmap("Backend Hub Roadmap");
    Roadmap reactRoadmap = saveOfficialRoadmap("React Hub Roadmap");

    adminRoadmapHubService.replaceCatalog(
        request(
            section(
                "role-based",
                "역할 기반 로드맵",
                "CARD_GRID",
                true,
                0,
                item(
                    "Backend",
                    "Backend",
                    "fas fa-server",
                    backendRoadmap.getRoadmapId(),
                    true,
                    true,
                    0)),
            section(
                "skill-based",
                "기술 기반 로드맵",
                "CHIP_GRID",
                true,
                1,
                item("React", null, null, reactRoadmap.getRoadmapId(), true, false, 0))));

    AdminRoadmapHubCatalogResponse response = roadmapHubQueryService.getAdminCatalog();

    assertThat(response.getSections()).hasSize(2);
    assertThat(response.getSections().get(0).getSectionKey()).isEqualTo("role-based");
    assertThat(response.getSections().get(0).getItems()).hasSize(1);
    assertThat(response.getSections().get(0).getItems().get(0).getLinkedRoadmapId())
        .isEqualTo(backendRoadmap.getRoadmapId());
    assertThat(response.getSections().get(1).getItems().get(0).getLinkedRoadmapTitle())
        .isEqualTo("React Hub Roadmap");
    assertThat(response.getOfficialRoadmaps())
        .extracting(AdminRoadmapHubCatalogResponse.OfficialRoadmapOption::getTitle)
        .containsExactly("Backend Hub Roadmap", "React Hub Roadmap");
  }

  @Test
  @DisplayName("공개 로드맵 허브 조회는 비활성 섹션과 비활성 항목을 제외한다")
  // 관리자 저장 데이터가 있어도 공개 허브에는 노출 대상만 내려가는지 확인한다.
  void getPublicCatalogFiltersInactiveSectionsAndItems() {
    Roadmap backendRoadmap = saveOfficialRoadmap("Backend Public Roadmap");

    adminRoadmapHubService.replaceCatalog(
        request(
            section(
                "role-based",
                "역할 기반 로드맵",
                "CARD_GRID",
                true,
                0,
                item(
                    "Backend",
                    "Backend",
                    "fas fa-server",
                    backendRoadmap.getRoadmapId(),
                    true,
                    true,
                    0),
                item("Hidden", null, null, null, false, false, 1)),
            section(
                "skill-based",
                "기술 기반 로드맵",
                "CHIP_GRID",
                false,
                1,
                item("React", null, null, null, true, false, 0))));

    RoadmapHubCatalogResponse response = roadmapHubQueryService.getPublicCatalog();

    assertThat(response.getSections()).hasSize(1);
    assertThat(response.getSections().get(0).getSectionKey()).isEqualTo("role-based");
    assertThat(response.getSections().get(0).getItems())
        .extracting(RoadmapHubCatalogResponse.Item::getTitle)
        .containsExactly("Backend");
  }

  private Roadmap saveOfficialRoadmap(String title) {
    return roadmapRepository.save(
        Roadmap.builder()
            .title(title)
            .description(title + " description")
            .isOfficial(true)
            .isPublic(true)
            .isDeleted(false)
            .build());
  }

  private RoadmapHubCatalogUpdateRequest request(
      RoadmapHubCatalogUpdateRequest.SectionRequest... sections) {
    RoadmapHubCatalogUpdateRequest request = new RoadmapHubCatalogUpdateRequest();
    ReflectionTestUtils.setField(request, "sections", java.util.List.of(sections));
    return request;
  }

  private RoadmapHubCatalogUpdateRequest.SectionRequest section(
      String sectionKey,
      String title,
      String layoutType,
      boolean active,
      int sortOrder,
      RoadmapHubCatalogUpdateRequest.ItemRequest... items) {
    RoadmapHubCatalogUpdateRequest.SectionRequest request =
        new RoadmapHubCatalogUpdateRequest.SectionRequest();
    ReflectionTestUtils.setField(request, "sectionKey", sectionKey);
    ReflectionTestUtils.setField(request, "title", title);
    ReflectionTestUtils.setField(request, "description", title + " description");
    ReflectionTestUtils.setField(request, "layoutType", layoutType);
    ReflectionTestUtils.setField(request, "active", active);
    ReflectionTestUtils.setField(request, "sortOrder", sortOrder);
    ReflectionTestUtils.setField(request, "items", java.util.List.of(items));
    return request;
  }

  private RoadmapHubCatalogUpdateRequest.ItemRequest item(
      String title,
      String subtitle,
      String iconClass,
      Long linkedRoadmapId,
      boolean active,
      boolean featured,
      int sortOrder) {
    RoadmapHubCatalogUpdateRequest.ItemRequest request =
        new RoadmapHubCatalogUpdateRequest.ItemRequest();
    ReflectionTestUtils.setField(request, "title", title);
    ReflectionTestUtils.setField(request, "subtitle", subtitle);
    ReflectionTestUtils.setField(request, "iconClass", iconClass);
    ReflectionTestUtils.setField(request, "linkedRoadmapId", linkedRoadmapId);
    ReflectionTestUtils.setField(request, "active", active);
    ReflectionTestUtils.setField(request, "featured", featured);
    ReflectionTestUtils.setField(request, "sortOrder", sortOrder);
    return request;
  }
}
