package com.devpath.api.admin.controller;

import com.devpath.api.admin.dto.TagGovernanceRequests.*;
import com.devpath.api.admin.dto.TagResponse;
import com.devpath.api.admin.service.AdminTagGovernanceService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "관리자 태그 거버넌스", description = "관리자 기술 태그 거버넌스 API")
@RestController
@RequestMapping("/api/admin/tags")
@RequiredArgsConstructor
public class AdminTagGovernanceController {

    private final AdminTagGovernanceService adminTagGovernanceService;

    @Operation(summary = "표준 태그 등록", description = "새로운 공식 기술 태그를 생성합니다.")
    @PostMapping
    public ApiResponse<Void> createTag(@RequestBody CreateTag request) {
        adminTagGovernanceService.createTag(request);
        return ApiResponse.ok();
    }

    @Operation(summary = "표준 태그 수정", description = "기존 태그의 이름이나 카테고리를 수정합니다.")
    @PutMapping("/{tagId}")
    public ApiResponse<Void> updateTag(@PathVariable Long tagId, @RequestBody UpdateTag request) {
        adminTagGovernanceService.updateTag(tagId, request);
        return ApiResponse.ok();
    }

    @Operation(summary = "전체 태그 조회", description = "등록된 모든 태그 목록을 조회합니다.")
    @GetMapping
    public ApiResponse<List<TagResponse>> getAllTags() {
        return ApiResponse.ok(adminTagGovernanceService.getAllTags());
    }

    @Operation(summary = "태그 병합 (중복 제거)", description = "비슷한 태그 2개를 하나로 합치고, 기존 매핑 정보를 이관합니다.")
    @PostMapping("/merge")
    public ApiResponse<Void> mergeTags(@RequestBody MergeTags request) {
        adminTagGovernanceService.mergeTags(request);
        return ApiResponse.ok();
    }

    @Operation(summary = "표준 용어 가이드 조회", description = "관리자 및 강사들이 참고할 태그 네이밍 가이드를 제공합니다.")
    @GetMapping("/guide")
    public ApiResponse<String> getTagGuide() {
        return ApiResponse.ok(adminTagGovernanceService.getTagGuide());
    }
}
