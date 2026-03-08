package com.devpath.api.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Getter;

public class RoadmapNodeDto {

  @Getter
  @Schema(description = "로드맵 노드 생성 요청 DTO")
  public static class CreateRequest {
    @NotBlank(message = "노드 제목은 필수입니다.")
    @Schema(description = "노드 제목", example = "Spring Security 인증 인가")
    private String title;

    @Schema(description = "노드 상세 내용", example = "JWT 토큰을 활용한 인증 과정을 학습합니다.")
    private String content;

    @NotBlank(message = "노드 타입은 필수입니다.")
    @Schema(description = "노드 타입 (CONCEPT, PRACTICE 등)", example = "CONCEPT")
    private String nodeType;

    @NotNull(message = "정렬 순서는 필수입니다.")
    @Schema(description = "로드맵 내 노드 순서", example = "1")
    private Integer sortOrder;
  }

  @Getter
  @Builder
  @Schema(description = "로드맵 노드 응답 DTO")
  public static class Response {
    @Schema(description = "노드 ID", example = "1")
    private Long nodeId;

    @Schema(description = "소속 로드맵 ID", example = "1")
    private Long roadmapId;

    @Schema(description = "노드 제목", example = "Spring Security 인증 인가")
    private String title;

    @Schema(description = "노드 상세 내용")
    private String content;

    @Schema(description = "노드 타입")
    private String nodeType;

    @Schema(description = "정렬 순서")
    private Integer sortOrder;
  }
}
