package com.devpath.api.recommendation.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.NoArgsConstructor;

public class RecommendationChangeRequest {

  @Getter
  @NoArgsConstructor
  @Schema(description = "Recommendation change suggestion request")
  public static class Suggestion {

    @Schema(description = "Roadmap id", example = "1")
    private Long roadmapId;

    @Schema(description = "Max item count", example = "5")
    private Integer limit;

    public static Suggestion of(Long roadmapId, Integer limit) {
      Suggestion suggestion = new Suggestion();
      suggestion.roadmapId = roadmapId;
      suggestion.limit = limit;
      return suggestion;
    }
  }

  @Getter
  @NoArgsConstructor
  @Schema(description = "Recommendation change recalculate request")
  public static class RecalculateNextNodes {

    @Schema(description = "Roadmap id", example = "1")
    private Long roadmapId;

    @Schema(description = "Max item count", example = "5")
    private Integer limit;
  }

  public static class SuggestionHolder extends Suggestion {

    public static Suggestion from(RecalculateNextNodes request) {
      return Suggestion.of(request.getRoadmapId(), request.getLimit());
    }
  }
}
