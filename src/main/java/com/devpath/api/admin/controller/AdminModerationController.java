package com.devpath.api.admin.controller;

import com.devpath.api.admin.dto.moderation.ContentBlindRequest;
import com.devpath.api.admin.dto.moderation.ModerationStatsResponse;
import com.devpath.api.admin.dto.moderation.ReportResolveRequest;
import com.devpath.api.admin.service.AdminModerationService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Admin - Moderation", description = "관리자 제재 관리 API")
@RestController
@RequestMapping("/api/admin/moderations")
@RequiredArgsConstructor
public class AdminModerationController {

    private final AdminModerationService adminModerationService;

    @Operation(summary = "신고 처리", description = "신고 건을 처리합니다. action: WARNING/SUSPEND/DISMISS")
    @PostMapping("/reports/{reportId}/resolve")
    public ApiResponse<Void> resolveReport(
            @PathVariable Long reportId,
            @RequestBody @Valid ReportResolveRequest request) {
        adminModerationService.resolveReport(reportId, request);
        return ApiResponse.success("신고가 처리되었습니다.", null);
    }

    @Operation(summary = "콘텐츠 블라인드 처리")
    @PostMapping("/contents/{contentId}/blind")
    public ApiResponse<Void> blindContent(
            @PathVariable Long contentId,
            @RequestBody @Valid ContentBlindRequest request) {
        adminModerationService.blindContent(contentId, request);
        return ApiResponse.success("콘텐츠가 블라인드 처리되었습니다.", null);
    }

    @Operation(summary = "제재 통계 조회")
    @GetMapping("/stats")
    public ApiResponse<ModerationStatsResponse> getModerationStats() {
        return ApiResponse.success("제재 통계를 조회했습니다.", adminModerationService.getModerationStats());
    }
}