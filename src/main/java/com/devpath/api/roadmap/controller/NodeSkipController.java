package com.devpath.api.roadmap.controller;

import com.devpath.api.roadmap.dto.NodeSkipDto;
import com.devpath.api.roadmap.service.NodeSkipService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Node Skip", description = "노드 스킵 API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/my-roadmaps/nodes")
public class NodeSkipController {

  private final NodeSkipService nodeSkipService;

  @Operation(
      summary = "노드 수동 스킵",
      description =
          """
                    유저가 보유한 태그와 노드의 필수 태그를 비교합니다.
                    조건을 충족하면 노드 상태를 COMPLETED로 변경합니다.
                    (JWT 적용 전 userId 임시 파라미터)
                    """)
  @ApiResponses({
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "200",
        description = "노드 스킵 성공"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "400",
        description = "필수 태그가 부족하거나 이미 완료한 노드"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "404",
        description = "노드를 찾을 수 없음")
  })
  @PostMapping("/{customNodeId}/skip")
  public ResponseEntity<ApiResponse<NodeSkipDto.Response>> skipNode(
      @Parameter(description = "유저 ID (JWT 적용 전 임시)", example = "1") @RequestParam Long userId,
      @Parameter(description = "커스텀 노드 ID", example = "5") @PathVariable Long customNodeId) {
    nodeSkipService.skipNode(userId, customNodeId);
    return ResponseEntity.ok(ApiResponse.ok(NodeSkipDto.Response.success()));
  }
}
