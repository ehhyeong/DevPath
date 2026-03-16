package com.devpath.api.user.controller;

import com.devpath.api.user.dto.RoadmapDto;
import com.devpath.api.user.service.RoadmapService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/roadmaps")
@RequiredArgsConstructor
@Tag(name = "로드맵 API", description = "공통 오피셜 로드맵 조회 API (비회원/일반유저 공통)")
public class RoadmapController {

  private final RoadmapService roadmapService;

  @Operation(summary = "오피셜 로드맵 전체 목록 조회")
  @GetMapping
  public ApiResponse<List<RoadmapDto.Response>> getOfficialRoadmaps() {
    return ApiResponse.success("로드맵 목록 조회 성공", roadmapService.getOfficialRoadmapList());
  }

  @Operation(summary = "오피셜 로드맵 트리 상세 조회", description = "특정 로드맵의 세부 정보와 하위 노드 목록을 정렬하여 조회합니다.")
  @GetMapping("/{roadmapId}")
  public ApiResponse<RoadmapDto.DetailResponse> getOfficialRoadmapDetail(
      @PathVariable Long roadmapId) {
    return ApiResponse.success(
        "로드맵 상세 트리 조회 성공", roadmapService.getOfficialRoadmapDetail(roadmapId));
  }
}
