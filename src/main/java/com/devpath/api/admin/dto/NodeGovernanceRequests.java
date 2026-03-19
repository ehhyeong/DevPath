package com.devpath.api.admin.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

public class NodeGovernanceRequests {

  @Getter
  @NoArgsConstructor(access = AccessLevel.PROTECTED)
  @Schema(description = "노드 필수 태그 변경 요청 DTO")
  public static class UpdateRequiredTags {

    @Schema(description = "필수 태그 ID 목록")
    private List<Long> tagIds;
  }

  @Getter
  @NoArgsConstructor(access = AccessLevel.PROTECTED)
  @Schema(description = "노드 타입 변경 요청 DTO")
  public static class UpdateNodeType {

    @Schema(description = "변경할 노드 타입", example = "CONCEPT")
    private String nodeType;
  }

  @Getter
  @NoArgsConstructor(access = AccessLevel.PROTECTED)
  @Schema(description = "노드 선행조건 변경 요청 DTO")
  public static class UpdatePrerequisites {

    @Schema(description = "선행 노드 ID 목록")
    private List<Long> prerequisiteNodeIds;
  }

  @Getter
  @NoArgsConstructor(access = AccessLevel.PROTECTED)
  @Schema(description = "노드 완료 기준 변경 요청 DTO")
  public static class UpdateCompletionRule {

    @Schema(description = "완료 기준 타입", example = "QUIZ_PASS")
    private String criteriaType;

    @Schema(description = "완료 기준 값", example = "80")
    private String criteriaValue;
  }
}
