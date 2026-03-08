package com.devpath.api.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Getter;

public class PrerequisiteDto {

  @Getter
  @Schema(description = "선행 조건 생성 요청 DTO")
  public static class CreateRequest {
    @NotNull(message = "선행 노드 ID는 필수입니다.")
    @Schema(description = "먼저 완료해야 하는 선행 노드의 ID", example = "1")
    private Long preNodeId;
  }

  @Getter
  @Builder
  @Schema(description = "선행 조건 응답 DTO")
  public static class Response {
    @Schema(description = "선행 조건 ID", example = "1")
    private Long prerequisiteId;

    @Schema(description = "현재 노드 ID", example = "2")
    private Long nodeId;

    @Schema(description = "먼저 완료해야 하는 선행 노드의 ID", example = "1")
    private Long preNodeId;
  }
}
