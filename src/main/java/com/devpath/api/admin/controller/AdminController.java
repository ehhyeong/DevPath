package com.devpath.api.admin.controller;

import com.devpath.api.admin.service.AdminService;
import com.devpath.api.user.dto.RoadmapDto;
import com.devpath.api.user.dto.TagDto;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@Tag(name = "Admin API", description = "관리자 전용 데이터 관리 API (태그, 오피셜 로드맵)")
// 관리자 전용 기능을 제공하는 컨트롤러
public class AdminController {

  private final AdminService adminService;

  @Operation(summary = "기술 태그 생성 (관리자)")
  @PostMapping("/tags")
  // 새로운 기술 태그를 등록한다.
  public ApiResponse<TagDto.Response> createTag(@Valid @RequestBody TagDto.CreateRequest request) {
    return ApiResponse.success("태그가 성공적으로 생성되었습니다.", adminService.createTag(request));
  }

  @Operation(summary = "기술 태그 수정 (관리자)")
  @PutMapping("/tags/{tagId}")
  // 기존 기술 태그의 이름이나 분류를 수정한다.
  public ApiResponse<TagDto.Response> updateTag(
      @PathVariable Long tagId, @Valid @RequestBody TagDto.CreateRequest request) {
    return ApiResponse.success("태그가 성공적으로 수정되었습니다.", adminService.updateTag(tagId, request));
  }

  @Operation(summary = "기술 태그 삭제 (관리자)")
  @DeleteMapping("/tags/{tagId}")
  // 더 이상 사용하지 않는 기술 태그를 삭제한다.
  public ApiResponse<Void> deleteTag(@PathVariable Long tagId) {
    adminService.deleteTag(tagId);
    return ApiResponse.success("태그가 성공적으로 삭제되었습니다.", null);
  }

  @Operation(summary = "오피셜 로드맵 생성 (관리자)")
  @PostMapping("/roadmaps")
  // 관리자가 공식 로드맵을 새로 생성한다.
  public ApiResponse<RoadmapDto.Response> createOfficialRoadmap(
      @Valid @RequestBody RoadmapDto.CreateRequest request, @AuthenticationPrincipal Long adminId) {
    return ApiResponse.success(
        "오피셜 로드맵이 성공적으로 생성되었습니다.", adminService.createOfficialRoadmap(request, adminId));
  }

  @Operation(summary = "오피셜 로드맵 수정 (관리자)")
  @PutMapping("/roadmaps/{roadmapId}")
  // 공식 로드맵의 제목과 설명을 수정한다.
  public ApiResponse<RoadmapDto.Response> updateOfficialRoadmap(
      @PathVariable Long roadmapId, @Valid @RequestBody RoadmapDto.CreateRequest request) {
    return ApiResponse.success(
        "오피셜 로드맵이 성공적으로 수정되었습니다.", adminService.updateOfficialRoadmap(roadmapId, request));
  }

  @Operation(summary = "오피셜 로드맵 삭제 (Soft Delete)")
  @DeleteMapping("/roadmaps/{roadmapId}")
  // 공식 로드맵을 바로 삭제하지 않고 삭제 상태로만 변경한다.
  public ApiResponse<Void> deleteOfficialRoadmap(@PathVariable Long roadmapId) {
    adminService.deleteOfficialRoadmap(roadmapId);
    return ApiResponse.success("오피셜 로드맵이 성공적으로 삭제되었습니다.", null);
  }
}
