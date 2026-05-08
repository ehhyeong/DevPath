package com.devpath.api.admin.controller;

import com.devpath.api.admin.dto.governance.AdminRoadmapNodeResourceResponse;
import com.devpath.api.admin.dto.governance.RoadmapNodeResourceUpsertRequest;
import com.devpath.api.admin.service.AdminRoadmapNodeResourceService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "관리자 - 로드맵 노드 추천 자료", description = "관리자 로드맵 노드 추천 자료 API")
@RestController
@RequestMapping("/api/admin/node-resources")
@RequiredArgsConstructor
public class AdminRoadmapNodeResourceController {

  private final AdminRoadmapNodeResourceService adminRoadmapNodeResourceService;

  @Operation(summary = "노드 추천 자료 목록 조회")
  @GetMapping
  public ApiResponse<List<AdminRoadmapNodeResourceResponse>> getResources() {
    return ApiResponse.success(
        "노드 추천 자료 목록을 조회했습니다.", adminRoadmapNodeResourceService.getResources());
  }

  @Operation(summary = "노드 추천 자료 등록")
  @PostMapping
  public ApiResponse<AdminRoadmapNodeResourceResponse> createResource(
      @RequestBody @Valid RoadmapNodeResourceUpsertRequest request) {
    return ApiResponse.success(
        "노드 추천 자료를 등록했습니다.", adminRoadmapNodeResourceService.createResource(request));
  }

  @Operation(summary = "노드 추천 자료 수정")
  @PutMapping("/{resourceId}")
  public ApiResponse<AdminRoadmapNodeResourceResponse> updateResource(
      @PathVariable Long resourceId, @RequestBody @Valid RoadmapNodeResourceUpsertRequest request) {
    return ApiResponse.success(
        "노드 추천 자료를 수정했습니다.", adminRoadmapNodeResourceService.updateResource(resourceId, request));
  }

  @Operation(summary = "노드 추천 자료 삭제")
  @DeleteMapping("/{resourceId}")
  public ApiResponse<Void> deleteResource(@PathVariable Long resourceId) {
    adminRoadmapNodeResourceService.deleteResource(resourceId);
    return ApiResponse.success("노드 추천 자료를 삭제했습니다.", null);
  }
}
