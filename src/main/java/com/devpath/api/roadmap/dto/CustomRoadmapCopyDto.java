package com.devpath.api.roadmap.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

public class CustomRoadmapCopyDto {

  @Getter
  @NoArgsConstructor(access = AccessLevel.PROTECTED)
  @Schema(name = "CustomRoadmapCopyRequest")
  public static class Request {

    @NotNull
    @Schema(description = "유저 ID (JWT 적용 전 임시)", example = "1")
    private Long userId;

    @NotNull
    @Schema(description = "복사할 오피셜 로드맵 ID", example = "1")
    private Long roadmapId;

    @Builder
    private Request(Long userId, Long roadmapId) {
      this.userId = userId;
      this.roadmapId = roadmapId;
    }
  }

  @Getter
  @NoArgsConstructor(access = AccessLevel.PROTECTED)
  @Schema(name = "CustomRoadmapCopyResponse")
  public static class Response {

    @Schema(description = "생성된 커스텀 로드맵 ID", example = "10")
    private Long customRoadmapId;

    @Builder
    private Response(Long customRoadmapId) {
      this.customRoadmapId = customRoadmapId;
    }

    public static Response of(Long customRoadmapId) {
      return Response.builder().customRoadmapId(customRoadmapId).build();
    }
  }
}
