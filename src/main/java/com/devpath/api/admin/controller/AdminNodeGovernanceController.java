package com.devpath.api.admin.controller;

import com.devpath.api.admin.dto.NodeGovernanceRequests.*;
import com.devpath.api.admin.service.AdminNodeGovernanceService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@Tag(name = "관리자 노드 관리", description = "관리자 노드 관리 및 규칙 설정 API")
@RestController
@RequestMapping("/api/admin/nodes")
@RequiredArgsConstructor
public class AdminNodeGovernanceController {

    private final AdminNodeGovernanceService adminNodeGovernanceService;

    @Operation(summary = "노드별 필수 태그 설정", description = "특정 노드를 클리어하기 위해 필요한 필수 태그를 덮어씁니다.")
    @PutMapping("/{nodeId}/required-tags")
    public ApiResponse<Void> updateRequiredTags(@PathVariable Long nodeId, @RequestBody UpdateRequiredTags request) {
        adminNodeGovernanceService.updateRequiredTags(nodeId, request);
        return ApiResponse.ok();
    }

    @Operation(summary = "노드 타입 설정", description = "노드의 학습 유형(개념, 실습, 프로젝트 등)을 변경합니다.")
    @PutMapping("/{nodeId}/type")
    public ApiResponse<Void> updateNodeType(@PathVariable Long nodeId, @RequestBody UpdateNodeType request) {
        adminNodeGovernanceService.updateNodeType(nodeId, request);
        return ApiResponse.ok();
    }

    @Operation(summary = "선행조건 / 잠금-해금 규칙 관리", description = "이 노드를 학습하기 전 클리어해야 하는 선행 노드들을 설정합니다.")
    @PutMapping("/{nodeId}/prerequisites")
    public ApiResponse<Void> updatePrerequisites(@PathVariable Long nodeId, @RequestBody UpdatePrerequisites request) {
        adminNodeGovernanceService.updatePrerequisites(nodeId, request);
        return ApiResponse.ok();
    }

    @Operation(summary = "완료 기준 설정", description = "강좌 완강률, 퀴즈 통과 등 노드 완료 조건을 설정합니다.")
    @PutMapping("/{nodeId}/completion-rule")
    public ApiResponse<Void> updateCompletionRule(@PathVariable Long nodeId, @RequestBody UpdateCompletionRule request) {
        adminNodeGovernanceService.updateCompletionRule(nodeId, request);
        return ApiResponse.ok();
    }
}
