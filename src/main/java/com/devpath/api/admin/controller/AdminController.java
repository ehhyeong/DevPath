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
public class AdminController {

    private final AdminService adminService;

    @Operation(summary = "기술 태그 생성 (관리자용)")
    @PostMapping("/tags")
    public ApiResponse<TagDto.Response> createTag(@Valid @RequestBody TagDto.CreateRequest request) {
        // 첫 번째 인자로 성공 메시지 추가
        return ApiResponse.success("태그가 성공적으로 생성되었습니다.", adminService.createTag(request));
    }

    @Operation(summary = "기술 태그 수정 (관리자용)")
    @PutMapping("/tags/{tagId}")
    public ApiResponse<TagDto.Response> updateTag(
            @PathVariable Long tagId,
            @Valid @RequestBody TagDto.CreateRequest request) {
        // 첫 번째 인자로 성공 메시지 추가
        return ApiResponse.success("태그가 성공적으로 수정되었습니다.", adminService.updateTag(tagId, request));
    }

    @Operation(summary = "오피셜 로드맵 생성 (관리자용)")
    @PostMapping("/roadmaps")
    public ApiResponse<RoadmapDto.Response> createOfficialRoadmap(
            @Valid @RequestBody RoadmapDto.CreateRequest request,
            @AuthenticationPrincipal Long adminId) {
        // 첫 번째 인자로 성공 메시지 추가
        return ApiResponse.success("오피셜 로드맵이 성공적으로 생성되었습니다.", adminService.createOfficialRoadmap(request, adminId));
    }

    @Operation(summary = "오피셜 로드맵 삭제 (Soft Delete)")
    @DeleteMapping("/roadmaps/{roadmapId}")
    public ApiResponse<Void> deleteOfficialRoadmap(@PathVariable Long roadmapId) {
        adminService.deleteOfficialRoadmap(roadmapId);
        // 반환할 데이터가 없으므로 null을 넘김
        return ApiResponse.success("오피셜 로드맵이 성공적으로 삭제되었습니다.", null);
    }
}