package com.devpath.api.learner.controller;

import com.devpath.api.learner.dto.SkillCheckDto;
import com.devpath.api.learner.service.SkillCheckService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/me")
@RequiredArgsConstructor
@Tag(name = "학습자 스킬 체크", description = "학습자의 보유 스킬 관리 및 로드맵 추천 API")
public class SkillCheckController {

  private final SkillCheckService skillCheckService;

  @PostMapping("/skills/check")
  @Operation(summary = "보유 스킬 등록", description = "사용자의 보유 스킬을 한 번에 등록합니다. 이미 등록된 스킬은 중복 등록하지 않습니다.")
  public ResponseEntity<ApiResponse<SkillCheckDto.RegisterSkillsResponse>> registerSkills(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @RequestBody SkillCheckDto.RegisterSkillsRequest request) {
    return ResponseEntity.ok(ApiResponse.ok(skillCheckService.registerSkills(userId, request)));
  }

  @GetMapping("/roadmaps/{roadmapId}/skill-suggestions")
  @Operation(
      summary = "로드맵 추천 스킬 조회",
      description = "특정 로드맵을 학습하기 위해 필요한 스킬 중 사용자가 아직 보유하지 않은 스킬을 추천합니다.")
  public ResponseEntity<ApiResponse<SkillCheckDto.SuggestedSkillsResponse>> getSuggestedSkills(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @Parameter(description = "로드맵 ID") @PathVariable Long roadmapId) {
    return ResponseEntity.ok(
        ApiResponse.ok(skillCheckService.getSuggestedSkills(userId, roadmapId)));
  }

  @GetMapping("/roadmaps/{roadmapId}/lock-status")
  @Operation(summary = "로드맵 노드 잠금 상태 조회", description = "로드맵의 모든 노드에 대한 잠금/해금 상태를 조회합니다.")
  public ResponseEntity<ApiResponse<SkillCheckDto.RoadmapLockStatusResponse>> getRoadmapLockStatus(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @Parameter(description = "로드맵 ID") @PathVariable Long roadmapId) {
    return ResponseEntity.ok(
        ApiResponse.ok(skillCheckService.getRoadmapLockStatus(userId, roadmapId)));
  }
}
