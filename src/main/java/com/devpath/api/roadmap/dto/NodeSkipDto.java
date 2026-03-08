package com.devpath.api.roadmap.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.Set;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

public class NodeSkipDto {

  @Getter
  @NoArgsConstructor(access = AccessLevel.PROTECTED)
  @Schema(name = "NodeSkipResponse")
  public static class Response {

    @Schema(description = "노드 스킵 성공 여부", example = "true")
    private Boolean skipped;

    @Schema(description = "메시지", example = "노드를 성공적으로 스킵했습니다.")
    private String message;

    @Schema(description = "부족한 태그 목록 (실패 시)", example = "[\"Spring\", \"Docker\"]")
    private Set<String> missingTags;

    @Builder
    private Response(Boolean skipped, String message, Set<String> missingTags) {
      this.skipped = skipped;
      this.message = message;
      this.missingTags = missingTags;
    }

    public static Response success() {
      return Response.builder().skipped(true).message("노드를 성공적으로 스킵했습니다.").build();
    }

    public static Response fail(Set<String> missingTags) {
      return Response.builder()
          .skipped(false)
          .message("노드 클리어에 필요한 태그가 부족합니다.")
          .missingTags(missingTags)
          .build();
    }
  }
}
