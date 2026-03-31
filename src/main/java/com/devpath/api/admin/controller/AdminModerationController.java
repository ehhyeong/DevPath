package com.devpath.api.admin.controller;

import com.devpath.api.admin.dto.moderation.ContentBlindRequest;
import com.devpath.api.admin.dto.moderation.ModerationStatsResponse;
import com.devpath.api.admin.dto.moderation.ReportResolveRequest;
import com.devpath.api.admin.service.AdminModerationService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Admin - Moderation", description = "관리자 제재 관리 API")
@RestController
@RequestMapping("/api/admin/moderations")
@RequiredArgsConstructor
public class AdminModerationController {

    private final AdminModerationService adminModerationService;

    // 신고 처리 시 실제 처리자 adminId를 함께 기록한다.
    @Operation(summary = "신고 처리", description = "action: WARNING / SUSPEND / DISMISS")
    @PostMapping("/reports/{reportId}/resolve")
    public ApiResponse<Void> resolveReport(
            @PathVariable Long reportId,
            @RequestBody @Valid ReportResolveRequest request,
            @Parameter(hidden = true) @AuthenticationPrincipal Long adminId
    ) {
        adminModerationService.resolveReport(reportId, adminId, request);
        return ApiResponse.success("신고가 처리되었습니다.", null);
    }

    // 블라인드 처리도 실제 처리자 adminId를 함께 저장한다.
    @Operation(summary = "콘텐츠 블라인드 처리")
    @PostMapping("/contents/{contentId}/blind")
    public ApiResponse<Void> blindContent(
            @PathVariable Long contentId,
            @RequestBody @Valid ContentBlindRequest request,
            @Parameter(hidden = true) @AuthenticationPrincipal Long adminId
    ) {
        adminModerationService.blindContent(contentId, adminId, request);
        return ApiResponse.success("콘텐츠가 블라인드 처리되었습니다.", null);
    }

    @Operation(summary = "제재 통계 조회")
    @GetMapping("/stats")
    public ApiResponse<ModerationStatsResponse> getModerationStats() {
        return ApiResponse.success("제재 통계를 조회했습니다.", adminModerationService.getModerationStats());
    }
}
