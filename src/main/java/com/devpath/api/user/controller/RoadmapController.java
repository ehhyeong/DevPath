package com.devpath.api.user.controller;

import com.devpath.api.roadmap.dto.RoadmapHubCatalogResponse;
import com.devpath.api.roadmap.service.RoadmapHubQueryService;
import com.devpath.api.user.dto.RoadmapDto;
import com.devpath.api.user.service.RoadmapService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/roadmaps")
@RequiredArgsConstructor
@Tag(name = "로드맵 API", description = "공개 로드맵과 로드맵 허브를 조회하는 API")
public class RoadmapController {

  private final RoadmapService roadmapService;
  private final RoadmapHubQueryService roadmapHubQueryService;

  @Operation(summary = "공식 로드맵 목록 조회")
  @GetMapping
  public ApiResponse<List<RoadmapDto.Response>> getOfficialRoadmaps() {
    return ApiResponse.success("로드맵 목록을 조회했습니다.", roadmapService.getOfficialRoadmapList());
  }

  // 로드맵 허브 화면에서 쓰는 섹션/항목 구성을 공개 조회로 내려준다.
  @Operation(summary = "로드맵 허브 카탈로그 조회")
  @GetMapping("/hub-catalog")
  public ApiResponse<RoadmapHubCatalogResponse> getRoadmapHubCatalog() {
    return ApiResponse.success("로드맵 허브 카탈로그를 조회했습니다.", roadmapHubQueryService.getPublicCatalog());
  }

  @Operation(summary = "공식 로드맵 상세 조회", description = "특정 로드맵의 기본 정보와 하위 노드 목록을 정렬해서 조회합니다.")
  @GetMapping("/{roadmapId}")
  public ApiResponse<RoadmapDto.DetailResponse> getOfficialRoadmapDetail(
      @PathVariable Long roadmapId) {
    return ApiResponse.success(
        "로드맵 상세 정보를 조회했습니다.", roadmapService.getOfficialRoadmapDetail(roadmapId));
  }
}
