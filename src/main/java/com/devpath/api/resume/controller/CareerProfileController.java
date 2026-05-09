package com.devpath.api.resume.controller;

import com.devpath.api.resume.dto.CareerProfileRequest;
import com.devpath.api.resume.dto.CareerProfileResponse;
import com.devpath.api.resume.service.CareerProfileService;
import com.devpath.common.response.ApiResponse;
import com.devpath.common.swagger.SwaggerTag;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = SwaggerTag.CAREER_PROFILE, description = "채용 분석용 프로필 빌더 API")
@RestController
@RequiredArgsConstructor
public class CareerProfileController {

  private final CareerProfileService careerProfileService;

  @PostMapping("/api/career-profiles")
  @Operation(summary = "채용 분석용 프로필 생성", description = "Resume Clinic과 채용 추천에 사용할 커리어 프로필을 생성합니다.")
  public ResponseEntity<ApiResponse<CareerProfileResponse.Detail>> createProfile(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @Valid @RequestBody CareerProfileRequest.Create request) {
    return ResponseEntity.ok(
        ApiResponse.ok(careerProfileService.createProfile(userId, request)));
  }

  @GetMapping("/api/career-profiles/me")
  @Operation(summary = "내 프로필 조회", description = "사용자 ID 기준으로 내 채용 분석용 프로필을 조회합니다.")
  public ResponseEntity<ApiResponse<CareerProfileResponse.Detail>> getMyProfile(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ResponseEntity.ok(ApiResponse.ok(careerProfileService.getMyProfile(userId)));
  }

  @PostMapping("/api/career-profiles/{profileId}/proof-cards")
  @Operation(summary = "Proof Card 선택", description = "채용 분석 프로필에 포함할 Proof Card를 선택합니다.")
  public ResponseEntity<ApiResponse<CareerProfileResponse.ProofCardDetail>> selectProofCard(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @PathVariable Long profileId,
      @Valid @RequestBody CareerProfileRequest.ProofCardSelect request) {
    return ResponseEntity.ok(
        ApiResponse.ok(careerProfileService.selectProofCard(userId, profileId, request)));
  }

  @DeleteMapping("/api/career-profiles/{profileId}/proof-cards/{proofCardId}")
  @Operation(summary = "Proof Card 제외", description = "채용 분석 프로필에서 선택한 Proof Card를 제외합니다.")
  public ResponseEntity<ApiResponse<Void>> excludeProofCard(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @PathVariable Long profileId, @PathVariable Long proofCardId) {
    careerProfileService.excludeProofCard(userId, profileId, proofCardId);
    return ResponseEntity.ok(ApiResponse.ok());
  }

  @PostMapping("/api/career-profiles/{profileId}/projects")
  @Operation(summary = "프로젝트 경험 선택", description = "채용 분석 프로필에 프로젝트 경험을 추가합니다.")
  public ResponseEntity<ApiResponse<CareerProfileResponse.ProjectDetail>> addProject(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @PathVariable Long profileId, @Valid @RequestBody CareerProfileRequest.ProjectAdd request) {
    return ResponseEntity.ok(ApiResponse.ok(careerProfileService.addProject(userId, profileId, request)));
  }

  @PostMapping("/api/career-profiles/{profileId}/skills")
  @Operation(summary = "self-reported skill 입력", description = "사용자가 직접 보유 기술 스택을 입력합니다.")
  public ResponseEntity<ApiResponse<CareerProfileResponse.SkillDetail>> addSkill(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @PathVariable Long profileId, @Valid @RequestBody CareerProfileRequest.SkillAdd request) {
    return ResponseEntity.ok(ApiResponse.ok(careerProfileService.addSkill(userId, profileId, request)));
  }

  @PostMapping("/api/career-profiles/{profileId}/snapshots")
  @Operation(summary = "분석용 프로필 스냅샷 저장", description = "현재 프로필 데이터를 고정 스냅샷으로 저장하고 버전을 생성합니다.")
  public ResponseEntity<ApiResponse<CareerProfileResponse.SnapshotDetail>> createSnapshot(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @PathVariable Long profileId,
      @Valid @RequestBody CareerProfileRequest.SnapshotCreate request) {
    return ResponseEntity.ok(
        ApiResponse.ok(careerProfileService.createSnapshot(userId, profileId, request)));
  }

  @GetMapping("/api/career-profiles/{profileId}/versions")
  @Operation(summary = "profile version 조회", description = "채용 분석용 프로필의 버전 목록을 조회합니다.")
  public ResponseEntity<ApiResponse<List<CareerProfileResponse.VersionDetail>>> getVersions(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @PathVariable Long profileId) {
    return ResponseEntity.ok(ApiResponse.ok(careerProfileService.getVersions(userId, profileId)));
  }
}
