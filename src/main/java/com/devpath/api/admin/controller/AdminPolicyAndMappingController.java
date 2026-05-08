package com.devpath.api.admin.controller;

import com.devpath.api.admin.dto.governance.CourseNodeMappingCandidateResponse;
import com.devpath.api.admin.dto.governance.CourseNodeMappingRequest;
import com.devpath.api.admin.dto.governance.StreamingPolicyUpdateRequest;
import com.devpath.api.admin.dto.governance.SystemPolicyResponse;
import com.devpath.api.admin.dto.governance.SystemPolicyUpdateRequest;
import com.devpath.api.admin.service.AdminPolicyAndMappingService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "관리자 - 정책/매핑", description = "관리자 정책/매핑 API")
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminPolicyAndMappingController {

  private final AdminPolicyAndMappingService policyAndMappingService;

  @Operation(summary = "강의-노드 매핑 후보 조회", description = "태그 기반 자동 분류 결과를 기준으로 매핑 후보를 조회합니다.")
  @GetMapping("/course-node-mappings/candidates")
  public ApiResponse<List<CourseNodeMappingCandidateResponse>> getMappingCandidates() {
    return ApiResponse.success(
        "매핑 후보를 조회했습니다.", policyAndMappingService.getMappingCandidatesSimple());
  }

  @Operation(summary = "강의-노드 매핑 반영", description = "강의와 노드의 연결을 반영합니다.")
  @PutMapping("/courses/{courseId}/node-mapping")
  public ApiResponse<Void> applyNodeMapping(
      @PathVariable Long courseId, @RequestBody @Valid CourseNodeMappingRequest request) {
    policyAndMappingService.applyNodeMapping(courseId, request);
    return ApiResponse.success("매핑이 반영되었습니다.", null);
  }

  @Operation(summary = "시스템 정책 조회", description = "현재 시스템 정책을 조회합니다.")
  @GetMapping("/system-policies")
  public ApiResponse<SystemPolicyResponse> getSystemPolicies() {
    return ApiResponse.success(
        "시스템 정책을 조회했습니다.", policyAndMappingService.getSystemPoliciesSimple());
  }

  @Operation(summary = "시스템 정책 수정", description = "플랫폼 운영 정책을 수정합니다.")
  @PutMapping("/system-policies")
  public ApiResponse<Void> updateSystemPolicies(
      @RequestBody @Valid SystemPolicyUpdateRequest request) {
    policyAndMappingService.updateSystemPoliciesSimple(request);
    return ApiResponse.success("시스템 정책이 수정되었습니다.", null);
  }

  @Operation(summary = "스트리밍 정책 수정", description = "스트리밍 관련 정책을 수정합니다.")
  @PutMapping("/streaming-policy")
  public ApiResponse<Void> updateStreamingPolicy(
      @RequestBody @Valid StreamingPolicyUpdateRequest request) {
    policyAndMappingService.updateStreamingPolicySimple(request);
    return ApiResponse.success("스트리밍 정책이 수정되었습니다.", null);
  }
}
