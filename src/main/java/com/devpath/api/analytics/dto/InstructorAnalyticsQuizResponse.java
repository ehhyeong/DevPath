package com.devpath.api.analytics.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.Builder;
import lombok.Getter;

public class InstructorAnalyticsQuizResponse {

  @Getter
  @Builder
  @Schema(description = "Quiz analytics summary")
  public static class Summary {

    @Schema(description = "Total attempts", example = "132")
    private Long totalAttempts;

    @Schema(description = "Passed attempts", example = "95")
    private Long passedAttempts;

    @Schema(description = "Average score rate", example = "78.6")
    private Double averageScoreRate;

    @Schema(description = "Average time spent seconds", example = "423")
    private Integer averageTimeSpentSeconds;
  }

  @Getter
  @Builder
  @Schema(description = "Question performance item")
  public static class QuestionPerformanceItem {

    @Schema(description = "Quiz id", example = "7")
    private Long quizId;

    @Schema(description = "Quiz title", example = "JWT authentication quiz")
    private String quizTitle;

    @Schema(description = "Roadmap node title", example = "Spring Security JWT authentication")
    private String nodeTitle;

    @Schema(description = "Question count", example = "10")
    private Integer questionCount;

    @Schema(description = "Attempt count", example = "32")
    private Long attemptCount;

    @Schema(description = "Pass rate", example = "68.8")
    private Double passRate;

    @Schema(description = "Average score rate", example = "74.2")
    private Double averageScoreRate;
  }

  @Getter
  @Builder
  @Schema(description = "Quiz analytics detail")
  public static class Detail {

    @Schema(description = "Summary")
    private Summary summary;

    @Schema(description = "Question performance items")
    private List<QuestionPerformanceItem> items;
  }
}
