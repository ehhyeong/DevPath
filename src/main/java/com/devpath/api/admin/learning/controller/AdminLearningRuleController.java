package com.devpath.api.admin.learning.controller;

import com.devpath.api.admin.learning.dto.AdminLearningRuleRequest;
import com.devpath.api.admin.learning.dto.AdminLearningRuleResponse;
import com.devpath.api.admin.learning.service.AdminLearningRuleService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// 관리자 학습 자동화 규칙 API 컨트롤러다.
@Tag(name = "관리자 - 학습 자동화 규칙", description = "관리자 학습 자동화 규칙 관리 API")
@RestController
@RequestMapping("/api/admin/learning-rules")
@RequiredArgsConstructor
public class AdminLearningRuleController {

  private final AdminLearningRuleService adminLearningRuleService;

  @Operation(summary = "학습 자동화 규칙 목록 조회", description = "전체 학습 자동화 규칙을 조회합니다.")
  @GetMapping
  public ResponseEntity<ApiResponse<List<AdminLearningRuleResponse.Detail>>> getRules() {
    return ResponseEntity.ok(ApiResponse.ok(adminLearningRuleService.getRules()));
  }

  @Operation(summary = "학습 자동화 규칙 생성", description = "학습 자동화 규칙을 생성합니다.")
  @PostMapping
  public ResponseEntity<ApiResponse<AdminLearningRuleResponse.Detail>> createRule(
      @Valid @RequestBody AdminLearningRuleRequest.Upsert request) {
    return ResponseEntity.ok(ApiResponse.ok(adminLearningRuleService.createRule(request)));
  }

  @Operation(summary = "학습 자동화 규칙 수정", description = "학습 자동화 규칙을 수정합니다.")
  @PutMapping("/{ruleId}")
  public ResponseEntity<ApiResponse<AdminLearningRuleResponse.Detail>> updateRule(
      @PathVariable Long ruleId, @Valid @RequestBody AdminLearningRuleRequest.Upsert request) {
    return ResponseEntity.ok(ApiResponse.ok(adminLearningRuleService.updateRule(ruleId, request)));
  }

  @Operation(summary = "학습 자동화 규칙 활성화", description = "학습 자동화 규칙을 활성화합니다.")
  @PatchMapping("/{ruleId}/enable")
  public ResponseEntity<ApiResponse<AdminLearningRuleResponse.Detail>> enableRule(
      @PathVariable Long ruleId) {
    return ResponseEntity.ok(ApiResponse.ok(adminLearningRuleService.enableRule(ruleId)));
  }

  @Operation(summary = "학습 자동화 규칙 비활성화", description = "학습 자동화 규칙을 비활성화합니다.")
  @PatchMapping("/{ruleId}/disable")
  public ResponseEntity<ApiResponse<AdminLearningRuleResponse.Detail>> disableRule(
      @PathVariable Long ruleId) {
    return ResponseEntity.ok(ApiResponse.ok(adminLearningRuleService.disableRule(ruleId)));
  }
}
