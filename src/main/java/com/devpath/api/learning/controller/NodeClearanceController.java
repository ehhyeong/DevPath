package com.devpath.api.learning.controller;

import com.devpath.api.learning.dto.NodeClearanceRequest;
import com.devpath.api.learning.dto.NodeClearanceResponse;
import com.devpath.api.learning.service.NodeClearanceService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "학습자 - 노드 클리어", description = "학습자 노드 클리어 판정 API")
@RestController
@RequestMapping("/api/me/node-clearances")
@RequiredArgsConstructor
public class NodeClearanceController {

  private final NodeClearanceService nodeClearanceService;

  @Operation(summary = "노드 클리어 재계산", description = "로드맵의 노드 클리어 상태를 재계산합니다.")
  @PostMapping("/recalculate")
  public ResponseEntity<ApiResponse<List<NodeClearanceResponse.Detail>>> recalculate(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @Valid @RequestBody NodeClearanceRequest.Recalculate request) {
    return ResponseEntity.ok(ApiResponse.ok(nodeClearanceService.recalculate(userId, request)));
  }

  @Operation(summary = "강의 기반 노드 클리어 재계산", description = "강의 완료 시 해당 강의에 매핑된 노드들의 클리어 상태를 재계산합니다.")
  @PostMapping("/recalculate-by-course")
  public ResponseEntity<ApiResponse<List<NodeClearanceResponse.Detail>>> recalculateByCourse(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @Valid @RequestBody NodeClearanceRequest.RecalculateByCourse request) {
    return ResponseEntity.ok(
        ApiResponse.ok(nodeClearanceService.recalculateByCourse(userId, request)));
  }

  @Operation(summary = "노드 클리어 단건 조회", description = "특정 노드의 현재 클리어 결과를 조회합니다.")
  @GetMapping("/{nodeId}")
  public ResponseEntity<ApiResponse<NodeClearanceResponse.Detail>> getNodeClearance(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @Parameter(description = "로드맵 노드 ID", example = "10") @PathVariable Long nodeId) {
    return ResponseEntity.ok(ApiResponse.ok(nodeClearanceService.getNodeClearance(userId, nodeId)));
  }

  @Operation(summary = "노드 클리어 목록 조회", description = "로드맵 기준 노드 클리어 결과 목록을 조회합니다.")
  @GetMapping
  public ResponseEntity<ApiResponse<List<NodeClearanceResponse.Detail>>> getNodeClearances(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @Parameter(description = "로드맵 ID", example = "1") @RequestParam(required = false)
          Long roadmapId) {
    return ResponseEntity.ok(
        ApiResponse.ok(nodeClearanceService.getNodeClearances(userId, roadmapId)));
  }

  @Operation(summary = "노드 클리어 사유 조회", description = "특정 노드의 클리어 판정 사유를 조회합니다.")
  @GetMapping("/{nodeId}/reasons")
  public ResponseEntity<ApiResponse<List<NodeClearanceResponse.ReasonDetail>>>
      getNodeClearanceReasons(
          @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
          @Parameter(description = "로드맵 노드 ID", example = "10") @PathVariable Long nodeId) {
    return ResponseEntity.ok(
        ApiResponse.ok(nodeClearanceService.getNodeClearanceReasons(userId, nodeId)));
  }

  @Operation(summary = "Proof Card 발급 조건 확인", description = "특정 노드의 Proof Card 발급 조건 충족 여부를 확인합니다.")
  @PostMapping("/{nodeId}/proof-check")
  public ResponseEntity<ApiResponse<NodeClearanceResponse.ProofCheck>> proofCheck(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @Parameter(description = "로드맵 노드 ID", example = "10") @PathVariable Long nodeId) {
    return ResponseEntity.ok(ApiResponse.ok(nodeClearanceService.proofCheck(userId, nodeId)));
  }
}
