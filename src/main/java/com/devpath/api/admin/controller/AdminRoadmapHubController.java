package com.devpath.api.admin.controller;

import com.devpath.api.admin.dto.roadmaphub.AdminRoadmapHubCatalogResponse;
import com.devpath.api.admin.dto.roadmaphub.RoadmapHubCatalogUpdateRequest;
import com.devpath.api.admin.service.AdminRoadmapHubService;
import com.devpath.api.roadmap.service.RoadmapHubQueryService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// 관리자 로드맵 허브 편집기에 필요한 조회와 저장 API를 제공한다.
@Tag(name = "관리자 - 로드맵 허브", description = "관리자 로드맵 허브 관리 API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin/roadmap-hub")
public class AdminRoadmapHubController {

  private final RoadmapHubQueryService roadmapHubQueryService;
  private final AdminRoadmapHubService adminRoadmapHubService;

  @Operation(summary = "로드맵 허브 구성 조회")
  @GetMapping
  public ApiResponse<AdminRoadmapHubCatalogResponse> getCatalog() {
    return ApiResponse.success("로드맵 허브 구성을 조회했습니다.", roadmapHubQueryService.getAdminCatalog());
  }

  @Operation(summary = "로드맵 허브 구성 저장")
  @PutMapping
  public ApiResponse<AdminRoadmapHubCatalogResponse> replaceCatalog(
      @RequestBody @Valid RoadmapHubCatalogUpdateRequest request) {
    adminRoadmapHubService.replaceCatalog(request);
    return ApiResponse.success("로드맵 허브 구성을 저장했습니다.", roadmapHubQueryService.getAdminCatalog());
  }
}
