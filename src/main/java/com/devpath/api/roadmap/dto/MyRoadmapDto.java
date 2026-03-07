package com.devpath.api.roadmap.dto;

import com.devpath.domain.roadmap.entity.CustomRoadmap;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

public class MyRoadmapDto {

    @Getter
    @NoArgsConstructor(access = AccessLevel.PROTECTED)
    @Schema(name = "MyRoadmapListResponse")
    public static class ListResponse {

        @Schema(description = "내 커스텀 로드맵 목록")
        private List<Item> roadmaps;

        @Builder
        private ListResponse(List<Item> roadmaps) {
            this.roadmaps = roadmaps;
        }

        public static ListResponse from(List<CustomRoadmap> entities) {
            return ListResponse.builder()
                    .roadmaps(entities.stream().map(Item::from).toList())
                    .build();
        }
    }

    @Getter
    @NoArgsConstructor(access = AccessLevel.PROTECTED)
    public static class Item {

        @Schema(example = "10")
        private Long customRoadmapId;

        @Schema(example = "1")
        private Long originalRoadmapId;

        @Schema(example = "백엔드 로드맵")
        private String title;

        @Schema(description = "생성 시각")
        private LocalDateTime createdAt;

        @Builder
        private Item(Long customRoadmapId, Long originalRoadmapId, String title, LocalDateTime createdAt) {
            this.customRoadmapId = customRoadmapId;
            this.originalRoadmapId = originalRoadmapId;
            this.title = title;
            this.createdAt = createdAt;
        }

        public static Item from(CustomRoadmap entity) {
            return Item.builder()
                    .customRoadmapId(entity.getId())
                    .originalRoadmapId(entity.getOriginalRoadmap().getId())
                    .title(entity.getTitle())
                    .createdAt(entity.getCreatedAt())
                    .build();
        }
    }
}