package com.devpath.api.admin.controller;

import com.devpath.api.admin.dto.moderation.ContentBlindRequest;
import com.devpath.api.admin.dto.moderation.ModerationReportSummaryResponse;
import com.devpath.api.admin.dto.moderation.ModerationStatsResponse;
import com.devpath.api.admin.dto.moderation.ReportResolveRequest;
import com.devpath.api.admin.entity.ModerationReportStatus;
import com.devpath.api.admin.service.AdminModerationService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "관리자 - 제재/신고", description = "관리자 제재/신고 관리 API")
@RestController
@RequestMapping("/api/admin/moderations")
@RequiredArgsConstructor
// 신고 처리와 블라인드 조치를 담당하는 관리자 API다.
public class AdminModerationController {

  private final AdminModerationService adminModerationService;

  @Operation(summary = "신고 처리", description = "action: WARNING / SUSPEND / DISMISS")
  @PostMapping("/reports/{reportId}/resolve")
  // 신고를 처리 완료로 바꾸고 필요하면 추가 제재를 수행한다.
  public ApiResponse<Void> resolveReport(
      @PathVariable Long reportId,
      @RequestBody @Valid ReportResolveRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal Long adminId) {
    adminModerationService.resolveReport(reportId, adminId, request);
    return ApiResponse.success("신고를 처리했습니다.", null);
  }

  @Operation(summary = "콘텐츠 블라인드 처리")
  @PostMapping("/contents/{contentId}/blind")
  // 신고된 콘텐츠를 블라인드 상태로 전환한다.
  public ApiResponse<Void> blindContent(
      @PathVariable Long contentId,
      @RequestBody @Valid ContentBlindRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal Long adminId) {
    adminModerationService.blindContent(contentId, adminId, request);
    return ApiResponse.success("콘텐츠를 블라인드 처리했습니다.", null);
  }

  @Operation(summary = "제재 통계 조회")
  @GetMapping("/stats")
  public ApiResponse<ModerationStatsResponse> getModerationStats() {
    return ApiResponse.success("제재 통계를 조회했습니다.", adminModerationService.getModerationStats());
  }

  @Operation(summary = "신고 목록 조회")
  @GetMapping("/reports")
  // 상태 기준으로 신고 목록을 조회한다.
  public ApiResponse<List<ModerationReportSummaryResponse>> getReports(
      @RequestParam(defaultValue = "PENDING") ModerationReportStatus status) {
    return ApiResponse.success("신고 목록을 조회했습니다.", adminModerationService.getReports(status));
  }
}
