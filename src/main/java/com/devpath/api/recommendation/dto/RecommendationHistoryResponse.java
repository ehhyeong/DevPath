package com.devpath.api.recommendation.dto;

import com.devpath.domain.learning.entity.recommendation.RecommendationHistory;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.Builder;
import lombok.Getter;

public class RecommendationHistoryResponse {

    @Getter
    @Builder
    @Schema(description = "추천 변경 이력 조회 응답 DTO")
    public static class ListResult {

        @Schema(description = "학습자 ID", example = "1")
        private Long userId;

        @Schema(description = "총 이력 수", example = "3")
        private Integer totalCount;

        @Schema(description = "추천 변경 이력 목록")
        private List<Item> histories;

        public static ListResult of(Long userId, List<RecommendationHistory> histories) {
            List<Item> items = histories == null
                    ? new ArrayList<>()
                    : histories.stream().map(Item::from).toList();

            return ListResult.builder()
                    .userId(userId)
                    .totalCount(items.size())
                    .histories(items)
                    .build();
        }
    }

    @Getter
    @Builder
    @Schema(description = "개별 추천 변경 이력 항목 DTO")
    public static class Item {

        @Schema(description = "이력 ID", example = "1")
        private Long historyId;

        @Schema(description = "추천 ID", example = "10")
        private Long recommendationId;

        @Schema(description = "노드 ID", example = "100")
        private Long nodeId;

        @Schema(description = "노드 제목", example = "Spring Security")
        private String nodeTitle;

        @Schema(description = "이전 상태", example = "PENDING")
        private String beforeStatus;

        @Schema(description = "이후 상태", example = "ACCEPTED")
        private String afterStatus;

        @Schema(description = "액션 타입", example = "ACCEPTED")
        private String actionType;

        @Schema(description = "이력 맥락", example = "현재 보유 태그로 바로 학습할 수 있는 다음 단계 노드입니다.")
        private String context;

        @Schema(description = "생성 시각", example = "2026-03-23T12:30:00")
        private LocalDateTime createdAt;

        public static Item from(RecommendationHistory history) {
            return Item.builder()
                    .historyId(history.getId())
                    .recommendationId(history.getRecommendationId())
                    .nodeId(history.getRoadmapNode() == null ? null : history.getRoadmapNode().getNodeId())
                    .nodeTitle(history.getRoadmapNode() == null ? null : history.getRoadmapNode().getTitle())
                    .beforeStatus(history.getBeforeStatus())
                    .afterStatus(history.getAfterStatus())
                    .actionType(history.getActionType())
                    .context(history.getContext())
                    .createdAt(history.getCreatedAt())
                    .build();
        }
    }
}
