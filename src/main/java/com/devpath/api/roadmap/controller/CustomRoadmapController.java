package com.devpath.api.roadmap.controller;

import com.devpath.api.roadmap.dto.CustomRoadmapCopyDto;
import com.devpath.api.roadmap.dto.MyRoadmapDto;
import com.devpath.api.roadmap.dto.NodeClearResponse;
import com.devpath.api.roadmap.service.CustomRoadmapCopyService;
import com.devpath.api.roadmap.service.CustomRoadmapNodeCommandService;
import com.devpath.api.roadmap.service.CustomRoadmapQueryService;
import com.devpath.api.roadmap.service.NodeClearanceCommandService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "커스텀 로드맵", description = "학습자 커스텀 로드맵 API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/my-roadmaps")
public class CustomRoadmapController {

  private final CustomRoadmapCopyService customRoadmapCopyService;
  private final CustomRoadmapQueryService customRoadmapQueryService;
  private final NodeClearanceCommandService nodeClearanceCommandService;
  private final CustomRoadmapNodeCommandService customRoadmapNodeCommandService;

  @Operation(summary = "내 커스텀 로드맵 목록 조회", description = "JWT 로그인 사용자의 커스텀 로드맵 목록을 최신순으로 조회합니다.")
  @GetMapping
  public ResponseEntity<ApiResponse<MyRoadmapDto.ListResponse>> getMyRoadmaps(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ResponseEntity.ok(
        ApiResponse.ok(
            MyRoadmapDto.ListResponse.of(customRoadmapQueryService.getMyRoadmaps(userId))));
  }

  @Operation(
      summary = "내 커스텀 로드맵 상세 조회",
      description =
          """
                    커스텀 로드맵 상세와 노드 상태를 조회합니다.
                    예: 유저 태그가 Java, Spring이면 복사 직후 해당 요구 태그를 가진 노드는 COMPLETED 상태로 조회됩니다.
                    JWT 로그인 사용자 기준으로 조회합니다.
                    """)
  @GetMapping("/{customRoadmapId}")
  public ResponseEntity<ApiResponse<MyRoadmapDto.DetailResponse>> getMyRoadmap(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @Parameter(description = "커스텀 로드맵 ID", example = "10") @PathVariable Long customRoadmapId) {
    return ResponseEntity.ok(
        ApiResponse.ok(customRoadmapQueryService.getMyRoadmap(userId, customRoadmapId)));
  }

  @Operation(
      summary = "오피셜 로드맵 복사",
      description =
          """
                    오피셜 로드맵을 사용자 커스텀 로드맵으로 복사합니다.
                    사용자가 이미 보유한 태그를 만족하는 노드는 복사 시 COMPLETED 상태로 생성됩니다.
                    예: 유저 태그가 Java, Spring이면 해당 요구 태그를 가진 노드는 복사 직후 완료 처리됩니다.
                    JWT 로그인 사용자 기준으로 복사합니다.
                    """)
  @PostMapping("/{roadmapId}")
  public ResponseEntity<ApiResponse<CustomRoadmapCopyDto.Response>> copy(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @Parameter(description = "복사할 오피셜 로드맵 ID", example = "1") @PathVariable Long roadmapId) {
    Long customRoadmapId = customRoadmapCopyService.copyToCustomRoadmap(userId, roadmapId);
    return ResponseEntity.ok(
        ApiResponse.success(
            "커스텀 로드맵이 생성되었습니다.", CustomRoadmapCopyDto.Response.of(customRoadmapId)));
  }

  @Operation(
      summary = "노드 클리어",
      description = "선행 노드 완료 및 필수 태그 조건을 충족하면 JWT 로그인 사용자의 노드를 완료 처리합니다.")
  @PostMapping("/{customRoadmapId}/nodes/{customNodeId}/clear")
  public ResponseEntity<ApiResponse<NodeClearResponse>> clearNode(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @Parameter(description = "커스텀 로드맵 ID", example = "10") @PathVariable Long customRoadmapId,
      @Parameter(description = "커스텀 노드 ID", example = "101") @PathVariable Long customNodeId) {
    return ResponseEntity.ok(
        ApiResponse.success(
            "노드가 클리어되었습니다.",
            nodeClearanceCommandService.clearNode(userId, customRoadmapId, customNodeId)));
  }

  @Operation(
      summary = "노드 스킵",
      description = "노드를 완료하지 않아도 다음 노드를 진행할 수 있도록 스킵 처리합니다(미완료 상태 유지).")
  @PostMapping("/{customRoadmapId}/nodes/{customNodeId}/defer")
  public ResponseEntity<ApiResponse<Void>> deferNode(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @Parameter(description = "커스텀 로드맵 ID", example = "10") @PathVariable Long customRoadmapId,
      @Parameter(description = "커스텀 노드 ID", example = "101") @PathVariable Long customNodeId) {
    customRoadmapNodeCommandService.setDeferred(userId, customRoadmapId, customNodeId, true);
    return ResponseEntity.ok(ApiResponse.success("노드를 스킵했습니다.", null));
  }

  @Operation(summary = "노드 스킵 해제", description = "스킵 처리된 노드의 스킵을 해제합니다.")
  @DeleteMapping("/{customRoadmapId}/nodes/{customNodeId}/defer")
  public ResponseEntity<ApiResponse<Void>> undeferNode(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @Parameter(description = "커스텀 로드맵 ID", example = "10") @PathVariable Long customRoadmapId,
      @Parameter(description = "커스텀 노드 ID", example = "101") @PathVariable Long customNodeId) {
    customRoadmapNodeCommandService.setDeferred(userId, customRoadmapId, customNodeId, false);
    return ResponseEntity.ok(ApiResponse.success("노드 스킵을 해제했습니다.", null));
  }

  @Operation(
      summary = "노드 삭제",
      description = "커스텀 로드맵에서 노드를 삭제하고 선행관계를 정리한 뒤 진행률을 재계산합니다.")
  @DeleteMapping("/{customRoadmapId}/nodes/{customNodeId}")
  public ResponseEntity<ApiResponse<Void>> deleteNode(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @Parameter(description = "커스텀 로드맵 ID", example = "10") @PathVariable Long customRoadmapId,
      @Parameter(description = "커스텀 노드 ID", example = "101") @PathVariable Long customNodeId) {
    customRoadmapNodeCommandService.deleteNode(userId, customRoadmapId, customNodeId);
    return ResponseEntity.ok(ApiResponse.success("노드를 삭제했습니다.", null));
  }

  // [TEMP] 추천 무료 강좌 조회 엔드포인트 — 임시 하드코딩, 추후 삭제 예정
  @Operation(
      summary = "추천 무료 강좌 courseId 조회 (임시)",
      description = "노드 제목·필수 태그 기반으로 무료 공개 강좌 courseId를 반환합니다. (임시 하드코딩)")
  @GetMapping("/{customRoadmapId}/nodes/{customNodeId}/recommended-course")
  public ResponseEntity<ApiResponse<Long>> getRecommendedCourse(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @Parameter(description = "커스텀 로드맵 ID", example = "10") @PathVariable Long customRoadmapId,
      @Parameter(description = "커스텀 노드 ID", example = "101") @PathVariable Long customNodeId) {
    return ResponseEntity.ok(
        ApiResponse.ok(
            customRoadmapQueryService.getRecommendedFreeCourseId(
                userId, customRoadmapId, customNodeId)));
  }

  // [/TEMP]

  @Operation(summary = "내 커스텀 로드맵 이름 변경", description = "JWT 로그인 사용자의 커스텀 로드맵 제목을 변경합니다.")
  @PatchMapping("/{customRoadmapId}")
  public ResponseEntity<ApiResponse<MyRoadmapDto.Item>> renameMyRoadmap(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @Parameter(description = "커스텀 로드맵 ID", example = "10") @PathVariable Long customRoadmapId,
      @RequestBody MyRoadmapDto.RenameRequest request) {
    return ResponseEntity.ok(
        ApiResponse.ok(
            customRoadmapQueryService.renameMyRoadmap(
                userId, customRoadmapId, request.getTitle())));
  }

  @Operation(summary = "내 커스텀 로드맵 삭제", description = "JWT 로그인 사용자의 커스텀 로드맵을 삭제합니다.")
  @DeleteMapping("/{customRoadmapId}")
  public ResponseEntity<ApiResponse<Void>> deleteMyRoadmap(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @PathVariable Long customRoadmapId) {
    customRoadmapQueryService.deleteMyRoadmap(userId, customRoadmapId);
    return ResponseEntity.ok(ApiResponse.ok());
  }
}
