package com.devpath.api.instructor.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

// 강의-노드 자동 분류 조회 DTO를 제공한다.
public class InstructorNodeClassificationDto {

  // 강의 자동 노드 분류 조회 응답 DTO다.
  @Getter
  @Builder
  @AllArgsConstructor
  @Schema(description = "강의 자동 노드 분류 조회 응답 DTO")
  public static class AutoClassificationResponse {

    @Schema(description = "강의 ID", example = "12")
    private Long courseId;

    @Schema(description = "강의 제목", example = "Spring Security 완전 정복")
    private String courseTitle;

    @Schema(description = "강의에 등록된 태그 목록")
    private List<String> courseTags;

    @Schema(description = "자동 분류된 노드 개수", example = "2")
    private Integer totalMatchedNodes;

    @Schema(description = "자동 분류된 노드 목록")
    private List<MatchedNodeItem> matchedNodes;
  }

  // 자동 분류된 노드 항목 DTO다.
  @Getter
  @Builder
  @AllArgsConstructor
  @Schema(description = "자동 분류된 노드 항목 DTO")
  public static class MatchedNodeItem {

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

    @Schema(description = "이 노드의 필수 태그 목록")
    private List<String> requiredTags;
  }
}
