package com.devpath.api.learning.controller;

import com.devpath.api.learning.dto.RiskWarningResponse;
import com.devpath.api.learning.service.RiskWarningService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@Tag(name = "리스크 경고", description = "학습자 난이도/선행 조건 리스크 경고 조회 및 확인 API")
@RestController
@RequestMapping("/api/learning/risk-warnings")
@RequiredArgsConstructor
public class RiskWarningController {

    private final RiskWarningService riskWarningService;

    @Operation(summary = "리스크 경고 목록 조회", description = "학습자의 리스크 경고 목록을 조회합니다. unacknowledgedOnly=true 시 미확인 경고만 반환합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<List<RiskWarningResponse>>> getWarnings(
            @AuthenticationPrincipal Long userId,
            @RequestParam(required = false, defaultValue = "false") boolean unacknowledgedOnly
    ) {
        return ResponseEntity.ok(ApiResponse.ok(riskWarningService.getWarnings(userId, unacknowledgedOnly)));
    }

    @Operation(summary = "리스크 경고 확인 처리", description = "학습자가 특정 리스크 경고를 확인 처리합니다.")
    @PatchMapping("/{warningId}/acknowledge")
    public ResponseEntity<ApiResponse<RiskWarningResponse>> acknowledgeWarning(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long warningId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(riskWarningService.acknowledgeWarning(userId, warningId)));
    }
}
