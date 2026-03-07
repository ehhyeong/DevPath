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
import org.springframework.web.bind.annotation.*;

import java.util.Set;

@Tag(name = "Node Skip", description = "노드 스킵 API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/my-roadmaps/nodes")
public class NodeSkipController {

    private final NodeSkipService nodeSkipService;

    @Operation(
            summary = "노드 수동 스킵",
            description = "유저가 보유한 태그와 노드의 필수 태그를 비교하여, " +
                    "조건을 충족하면 노드 상태를 CLEARED(완료)로 변경합니다. " +
                    "(JWT 적용 전 userId는 임시 파라미터)"
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200",
                    description = "노드 스킵 성공"
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "400",
                    description = "필수 태그 부족 또는 이미 클리어한 노드"
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "404",
                    description = "노드를 찾을 수 없음"
            )
    })
    @PostMapping("/{customNodeId}/skip")
    public ResponseEntity<ApiResponse<NodeSkipDto.Response>> skipNode(
            @Parameter(description = "유저 ID (JWT 적용 전 임시)", example = "1")
            @RequestParam Long userId,
            
            @Parameter(description = "커스텀 노드 ID", example = "5")
            @PathVariable Long customNodeId
    ) {
        // 노드 스킵 처리 (조건 미달 시 예외 발생)
        Set<String> missingTags = nodeSkipService.skipNode(userId, customNodeId);

        // 성공 응답
        return ResponseEntity.ok(
                ApiResponse.ok(NodeSkipDto.Response.success())
        );
    }
}
