package com.devpath.api.recommendation.dto;

import com.devpath.domain.learning.entity.recommendation.RiskWarning;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.Builder;
import lombok.Getter;

public class RiskWarningResponse {

    @Getter
    @Builder
    @Schema(description = "리스크 경고 조회 응답 DTO")
    public static class ListResult {

        @Schema(description = "학습자 ID", example = "1")
        private Long userId;

        @Schema(description = "총 경고 수", example = "2")
        private Integer totalCount;

        @Schema(description = "리스크 경고 목록")
        private List<Item> warnings;

        public static ListResult of(Long userId, List<RiskWarning> warnings) {
            List<Item> items = warnings == null
                    ? new ArrayList<>()
                    : warnings.stream().map(Item::from).toList();

            return ListResult.builder()
                    .userId(userId)
                    .totalCount(items.size())
                    .warnings(items)
                    .build();
        }
    }

    @Getter
    @Builder
    @Schema(description = "개별 리스크 경고 항목 DTO")
    public static class Item {

        @Schema(description = "경고 ID", example = "1")
        private Long warningId;

        @Schema(description = "노드 ID", example = "100")
        private Long nodeId;

        @Schema(description = "노드 제목", example = "Spring Security")
        private String nodeTitle;

        @Schema(description = "경고 유형", example = "PREREQUISITE_MISSING")
        private String warningType;

        @Schema(description = "리스크 강도", example = "HIGH")
        private String riskLevel;

        @Schema(description = "경고 메시지", example = "필수 태그가 부족하여 난이도가 높을 수 있습니다.")
        private String message;

        @Schema(description = "확인 여부", example = "false")
        private Boolean acknowledged;

        @Schema(description = "생성 시각", example = "2026-03-23T12:30:00")
        private LocalDateTime createdAt;

        public static Item from(RiskWarning warning) {
            return Item.builder()
                    .warningId(warning.getId())
                    .nodeId(warning.getRoadmapNode() == null ? null : warning.getRoadmapNode().getNodeId())
                    .nodeTitle(warning.getRoadmapNode() == null ? null : warning.getRoadmapNode().getTitle())
                    .warningType(warning.getWarningType())
                    .riskLevel(warning.getRiskLevel())
                    .message(warning.getMessage())
                    .acknowledged(warning.getIsAcknowledged())
                    .createdAt(warning.getCreatedAt())
                    .build();
        }
    }
}
