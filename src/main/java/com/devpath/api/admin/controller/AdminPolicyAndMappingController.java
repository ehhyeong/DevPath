package com.devpath.api.admin.controller;

import com.devpath.api.admin.dto.PolicyGovernanceRequests.UpdateNodeMapping;
import com.devpath.api.admin.dto.PolicyGovernanceRequests.UpdateStreamingPolicy;
import com.devpath.api.admin.dto.PolicyGovernanceRequests.UpdateSystemPolicy;
import com.devpath.api.admin.dto.PolicyGovernanceResponses.MappingCandidatesResponse;
import com.devpath.api.admin.dto.PolicyGovernanceResponses.SystemPolicyResponse;
import com.devpath.api.admin.service.AdminPolicyAndMappingService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "관리자 정책 및 매핑", description = "관리자 정책 및 강의-노드 매핑 API")
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminPolicyAndMappingController {

  private final AdminPolicyAndMappingService policyAndMappingService;

  @Operation(summary = "강의-노드 매핑 후보 조회", description = "강의 태그와 노드 필수 태그를 비교해 후보와 커버리지를 조회합니다.")
  @GetMapping("/course-node-mappings/candidates")
  public ApiResponse<MappingCandidatesResponse> getMappingCandidates() {
    return ApiResponse.ok(policyAndMappingService.getMappingCandidates());
  }

  @Operation(summary = "강의-노드 매핑 확정", description = "관리자가 검토한 노드 매핑을 강의에 확정 저장합니다.")
  @PutMapping("/courses/{courseId}/node-mapping")
  public ApiResponse<Void> updateCourseNodeMapping(
      @PathVariable Long courseId, @RequestBody UpdateNodeMapping request) {
    policyAndMappingService.updateCourseNodeMapping(courseId, request);
    return ApiResponse.ok();
  }

  @Operation(summary = "시스템 정책 조회", description = "플랫폼 수수료, 정산 비율, 스트리밍 정책을 조회합니다.")
  @GetMapping("/system-policies")
  public ApiResponse<SystemPolicyResponse> getSystemPolicies() {
    return ApiResponse.ok(policyAndMappingService.getSystemPolicies());
  }

  @Operation(summary = "시스템 정책 수정", description = "플랫폼 수수료율과 정산 비율을 수정합니다.")
  @PutMapping("/system-policies")
  public ApiResponse<Void> updateSystemPolicies(@RequestBody UpdateSystemPolicy request) {
    policyAndMappingService.updateSystemPolicies(request);
    return ApiResponse.ok();
  }

  @Operation(summary = "스트리밍 정책 수정", description = "HLS 암호화 여부와 동시 접속 허용 기기 수를 수정합니다.")
  @PutMapping("/streaming-policy")
  public ApiResponse<Void> updateStreamingPolicy(@RequestBody UpdateStreamingPolicy request) {
    policyAndMappingService.updateStreamingPolicy(request);
    return ApiResponse.ok();
  }
}
