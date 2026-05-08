package com.devpath.api.admin.controller;

import com.devpath.api.admin.dto.governance.TagCreateRequest;
import com.devpath.api.admin.dto.governance.TagGuideResponse;
import com.devpath.api.admin.dto.governance.TagMergeRequest;
import com.devpath.api.admin.dto.governance.TagResponse;
import com.devpath.api.admin.dto.governance.TagUpdateRequest;
import com.devpath.api.admin.service.AdminTagGovernanceService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@Tag(name = "관리자 - 태그 거버넌스", description = "관리자 태그 거버넌스 API")
@RestController
@RequestMapping("/api/admin/tags")
@RequiredArgsConstructor
public class AdminTagGovernanceController {

  private final AdminTagGovernanceService adminTagGovernanceService;

  @Operation(summary = "태그 등록")
  @PostMapping
  public ApiResponse<TagResponse> createTag(@RequestBody @Valid TagCreateRequest request) {
    return ApiResponse.success("태그가 등록되었습니다.", adminTagGovernanceService.createTag(request));
  }

  @Operation(summary = "태그 수정")
  @PutMapping("/{tagId}")
  public ApiResponse<TagResponse> updateTag(
      @PathVariable Long tagId, @RequestBody @Valid TagUpdateRequest request) {
    return ApiResponse.success("태그가 수정되었습니다.", adminTagGovernanceService.updateTag(tagId, request));
  }

  @Operation(summary = "태그 목록 조회")
  @GetMapping
  public ApiResponse<List<TagResponse>> getTags() {
    return ApiResponse.success("태그 목록을 조회했습니다.", adminTagGovernanceService.getTags());
  }

  @Operation(summary = "태그 병합", description = "sourceTagIds를 targetTagId로 통합")
  @PostMapping("/merge")
  public ApiResponse<Void> mergeTags(@RequestBody @Valid TagMergeRequest request) {
    adminTagGovernanceService.mergeTags(request);
    return ApiResponse.success("태그가 병합되었습니다.", null);
  }

  @Operation(summary = "태그 가이드 조회", description = "표준 태그 목록 및 가이드 메시지 반환")
  @GetMapping("/guide")
  public ApiResponse<TagGuideResponse> getTagGuide() {
    return ApiResponse.success("태그 가이드를 조회했습니다.", adminTagGovernanceService.getTagGuide());
  }
}
