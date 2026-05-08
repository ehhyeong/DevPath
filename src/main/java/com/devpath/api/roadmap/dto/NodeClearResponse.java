package com.devpath.api.roadmap.dto;

import com.devpath.domain.roadmap.entity.CustomRoadmapNode;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@Schema(description = "노드 클리어 결과 응답")
public class NodeClearResponse {

  @Schema(description = "커스텀 노드 ID", example = "101")
  private Long customNodeId;

  @Schema(description = "원본 노드 ID", example = "5")
  private Long originalNodeId;

  @Schema(description = "노드 제목", example = "Spring Boot & MVC")
  private String title;

  @Schema(description = "완료 처리 시각")
  private LocalDateTime completedAt;

  public static NodeClearResponse of(CustomRoadmapNode node) {
    return NodeClearResponse.builder()
        .customNodeId(node.getId())
        .originalNodeId(node.getOriginalNode().getNodeId())
        .title(node.getOriginalNode().getTitle())
        .completedAt(node.getCompletedAt())
        .build();
  }
}
