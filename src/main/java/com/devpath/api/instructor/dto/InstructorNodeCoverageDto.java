package com.devpath.api.instructor.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

// 강의-노드 태그 커버리지 조회 DTO를 제공한다.
public class InstructorNodeCoverageDto {

  // 강의별 노드 태그 커버리지 조회 응답 DTO다.
  @Getter
  @Builder
  @AllArgsConstructor
  @Schema(description = "강의별 노드 태그 커버리지 조회 응답 DTO")
  public static class NodeCoverageResponse {

    @Schema(description = "강의 ID", example = "12")
    private Long courseId;

    @Schema(description = "강의 제목", example = "Spring Security 완전 정복")
    private String courseTitle;

    @Schema(description = "강의 태그 목록")
    private List<String> courseTags;

    @Schema(description = "커버리지 계산 대상 노드 수", example = "5")
    private Integer totalNodes;

    @Schema(description = "노드별 태그 커버리지 목록")
    private List<NodeCoverageItem> nodeCoverages;
  }

  // 노드별 태그 커버리지 항목 DTO다.
  @Getter
  @Builder
  @AllArgsConstructor
  @Schema(description = "노드별 태그 커버리지 항목 DTO")
  public static class NodeCoverageItem {

    @Schema(description = "로드맵 ID", example = "3")
    private Long roadmapId;

    @Schema(description = "로드맵 제목", example = "백엔드 Spring 로드맵")
    private String roadmapTitle;

    @Schema(description = "노드 ID", example = "21")
    private Long nodeId;

    @Schema(description = "노드 제목", example = "Spring Security")
    private String nodeTitle;

    @Schema(description = "노드 타입", example = "CONCEPT")
    private String nodeType;

    @Schema(description = "노드 정렬 순서", example = "4")
    private Integer sortOrder;

    @Schema(description = "노드 필수 태그 목록")
    private List<String> requiredTags;

    @Schema(description = "강의 태그와 일치한 태그 목록")
    private List<String> matchedTags;

    @Schema(description = "아직 부족한 태그 목록")
    private List<String> missingTags;

    @Schema(description = "태그 커버리지 퍼센트", example = "66.7")
    private BigDecimal coveragePercent;
  }
}
