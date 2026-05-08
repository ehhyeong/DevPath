package com.devpath.api.admin.controller;

import com.devpath.api.admin.service.AdminService;
import com.devpath.api.user.dto.RoadmapDto;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@Tag(name = "관리자 - 오피셜 로드맵", description = "관리자 오피셜 로드맵 관리 API")
public class AdminController {

  private final AdminService adminService;

  // 관리자 전용 컨트롤러에서는 오피셜 로드맵 관리만 담당한다.
  @Operation(summary = "오피셜 로드맵 목록 조회")
  @GetMapping("/roadmaps")
  public ApiResponse<List<RoadmapDto.Response>> getOfficialRoadmaps() {
    return ApiResponse.success("오피셜 로드맵 목록을 조회했습니다.", adminService.getOfficialRoadmaps());
  }

  @Operation(summary = "오피셜 로드맵 생성")
  @PostMapping("/roadmaps")
  public ApiResponse<RoadmapDto.Response> createOfficialRoadmap(
      @Valid @RequestBody RoadmapDto.CreateRequest request, @AuthenticationPrincipal Long adminId) {
    return ApiResponse.success(
        "오피셜 로드맵이 성공적으로 생성되었습니다.", adminService.createOfficialRoadmap(request, adminId));
  }

  // 공식 로드맵의 제목과 설명을 수정한다.
  @Operation(summary = "오피셜 로드맵 수정")
  @PutMapping("/roadmaps/{roadmapId}")
  public ApiResponse<RoadmapDto.Response> updateOfficialRoadmap(
      @PathVariable Long roadmapId, @Valid @RequestBody RoadmapDto.CreateRequest request) {
    return ApiResponse.success(
        "오피셜 로드맵이 성공적으로 수정되었습니다.", adminService.updateOfficialRoadmap(roadmapId, request));
  }

  @Operation(summary = "오피셜 로드맵 소개 콘텐츠 수정")
  @PutMapping("/roadmaps/{roadmapId}/info")
  public ApiResponse<RoadmapDto.Response> updateOfficialRoadmapInfo(
      @PathVariable Long roadmapId, @RequestBody RoadmapDto.InfoUpdateRequest request) {
    return ApiResponse.success(
        "오피셜 로드맵 소개 콘텐츠가 성공적으로 수정되었습니다.",
        adminService.updateOfficialRoadmapInfo(roadmapId, request));
  }

  @Operation(summary = "오피셜 로드맵 소개 콘텐츠 삭제")
  @DeleteMapping("/roadmaps/{roadmapId}/info")
  public ApiResponse<RoadmapDto.Response> clearOfficialRoadmapInfo(@PathVariable Long roadmapId) {
    return ApiResponse.success(
        "오피셜 로드맵 소개 콘텐츠가 삭제되었습니다.", adminService.clearOfficialRoadmapInfo(roadmapId));
  }

  // 공식 로드맵은 물리 삭제 대신 soft delete 처리한다.
  @Operation(summary = "오피셜 로드맵 삭제")
  @DeleteMapping("/roadmaps/{roadmapId}")
  public ApiResponse<Void> deleteOfficialRoadmap(@PathVariable Long roadmapId) {
    adminService.deleteOfficialRoadmap(roadmapId);
    return ApiResponse.success("오피셜 로드맵이 성공적으로 삭제되었습니다.", null);
  }
}
