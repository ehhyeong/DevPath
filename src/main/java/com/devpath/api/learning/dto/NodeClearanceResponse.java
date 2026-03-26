package com.devpath.api.learning.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

// Node Clearance 응답 DTO 모음
public class NodeClearanceResponse {

    // 노드 클리어 상세 응답 DTO
    @Getter
    @Builder
    @Schema(description = "노드 클리어 상세 응답 DTO")
    public static class Detail {

        // 로드맵 노드 ID
        @Schema(description = "로드맵 노드 ID", example = "10")
        private Long nodeId;

        // 클리어 상태
        @Schema(description = "클리어 상태", example = "CLEARED")
        private String clearanceStatus;
    }
}
