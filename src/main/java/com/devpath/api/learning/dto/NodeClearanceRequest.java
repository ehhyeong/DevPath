package com.devpath.api.learning.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.NoArgsConstructor;

// Node Clearance 요청 DTO 모음
public class NodeClearanceRequest {

    // 노드 클리어 재계산 요청 DTO
    @Getter
    @NoArgsConstructor
    @Schema(description = "노드 클리어 재계산 요청 DTO")
    public static class Recalculate {

        // 로드맵 ID
        @Schema(description = "로드맵 ID", example = "1")
        private Long roadmapId;
    }

    // Proof 체크 요청 DTO
    @Getter
    @NoArgsConstructor
    @Schema(description = "Proof 체크 요청 DTO")
    public static class ProofCheck {

        // 로드맵 노드 ID
        @Schema(description = "로드맵 노드 ID", example = "10")
        private Long nodeId;
    }
}
