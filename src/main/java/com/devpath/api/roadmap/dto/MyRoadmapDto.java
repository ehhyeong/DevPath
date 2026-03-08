package com.devpath.api.roadmap.dto;

import com.devpath.domain.roadmap.entity.CustomRoadmap;
import com.devpath.domain.roadmap.entity.CustomRoadmapNode;
import com.devpath.domain.roadmap.entity.NodeStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

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
      return ListResponse.builder().roadmaps(entities.stream().map(Item::from).toList()).build();
    }
  }

  @Getter
  @NoArgsConstructor(access = AccessLevel.PROTECTED)
  public static class Item {

    @Schema(example = "10")
    private Long customRoadmapId;

    @Schema(example = "1")
    private Long originalRoadmapId;

    @Schema(example = "Backend Master Roadmap")
    private String title;

    @Schema(description = "생성 시각")
    private LocalDateTime createdAt;

    @Builder
    private Item(
        Long customRoadmapId, Long originalRoadmapId, String title, LocalDateTime createdAt) {
      this.customRoadmapId = customRoadmapId;
      this.originalRoadmapId = originalRoadmapId;
      this.title = title;
      this.createdAt = createdAt;
    }

    public static Item from(CustomRoadmap entity) {
      return Item.builder()
          .customRoadmapId(entity.getId())
          .originalRoadmapId(entity.getOriginalRoadmap().getRoadmapId())
          .title(entity.getTitle())
          .createdAt(entity.getCreatedAt())
          .build();
    }
  }

  @Getter
  @NoArgsConstructor(access = AccessLevel.PROTECTED)
  @Schema(name = "MyRoadmapDetailResponse")
  public static class DetailResponse {

    @Schema(example = "10")
    private Long customRoadmapId;

    @Schema(example = "1")
    private Long originalRoadmapId;

    @Schema(example = "Backend Master Roadmap")
    private String title;

    @Schema(example = "0")
    private Integer progressRate;

    @Schema(description = "생성 시각")
    private LocalDateTime createdAt;

    @Schema(description = "내 로드맵 노드 목록")
    private List<NodeItem> nodes;

    @Builder
    private DetailResponse(
        Long customRoadmapId,
        Long originalRoadmapId,
        String title,
        Integer progressRate,
        LocalDateTime createdAt,
        List<NodeItem> nodes) {
      this.customRoadmapId = customRoadmapId;
      this.originalRoadmapId = originalRoadmapId;
      this.title = title;
      this.progressRate = progressRate;
      this.createdAt = createdAt;
      this.nodes = nodes;
    }

    public static DetailResponse from(
        CustomRoadmap customRoadmap,
        List<CustomRoadmapNode> nodes,
        Map<Long, List<Long>> prerequisiteIdsByNodeId) {
      return DetailResponse.builder()
          .customRoadmapId(customRoadmap.getId())
          .originalRoadmapId(customRoadmap.getOriginalRoadmap().getRoadmapId())
          .title(customRoadmap.getTitle())
          .progressRate(customRoadmap.getProgressRate())
          .createdAt(customRoadmap.getCreatedAt())
          .nodes(
              nodes.stream()
                  .map(
                      node ->
                          NodeItem.from(
                              node, prerequisiteIdsByNodeId.getOrDefault(node.getId(), List.of())))
                  .toList())
          .build();
    }
  }

  @Getter
  @NoArgsConstructor(access = AccessLevel.PROTECTED)
  public static class NodeItem {

    @Schema(example = "101")
    private Long customNodeId;

    @Schema(example = "11")
    private Long originalNodeId;

    @Schema(example = "Java Basics")
    private String title;

    @Schema(example = "1")
    private Integer sortOrder;

    @Schema(example = "COMPLETED")
    private NodeStatus status;

    @Schema(description = "선행 커스텀 노드 ID 목록")
    private List<Long> prerequisiteCustomNodeIds;

    @Builder
    private NodeItem(
        Long customNodeId,
        Long originalNodeId,
        String title,
        Integer sortOrder,
        NodeStatus status,
        List<Long> prerequisiteCustomNodeIds) {
      this.customNodeId = customNodeId;
      this.originalNodeId = originalNodeId;
      this.title = title;
      this.sortOrder = sortOrder;
      this.status = status;
      this.prerequisiteCustomNodeIds = prerequisiteCustomNodeIds;
    }

    public static NodeItem from(CustomRoadmapNode node, List<Long> prerequisiteCustomNodeIds) {
      return NodeItem.builder()
          .customNodeId(node.getId())
          .originalNodeId(node.getOriginalNode().getNodeId())
          .title(node.getOriginalNode().getTitle())
          .sortOrder(node.getOriginalNode().getSortOrder())
          .status(node.getStatus())
          .prerequisiteCustomNodeIds(prerequisiteCustomNodeIds)
          .build();
    }
  }
}
