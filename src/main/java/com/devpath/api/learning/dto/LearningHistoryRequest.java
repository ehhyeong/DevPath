package com.devpath.api.learning.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;

public class LearningHistoryRequest {

  @Getter
  @NoArgsConstructor
  @Schema(description = "Learning history share-link creation request")
  public static class CreateShareLink {

    @Schema(description = "Share title", example = "Kim Taehyeong learning history")
    private String title;

    @Schema(description = "Expiration time", example = "2026-04-30T23:59:59")
    private LocalDateTime expiresAt;
  }

  @Getter
  @NoArgsConstructor
  @Schema(description = "Learning history organize request")
  public static class Organize {

    @Schema(description = "Target roadmap id", example = "1")
    private Long roadmapId;
  }
}
