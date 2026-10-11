package com.devpath.api.workspace.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;

public class WorkspaceInterviewRequest {
  private WorkspaceInterviewRequest() {}

  public record Practice(@NotBlank @Size(max = 300000) String content) {}

  public record Share(
      @NotBlank @Size(max = 80) String questionId, @NotBlank @Size(max = 12000) String text) {}

  public record SharedAnswer(String questionId, Long userId, String name, String text) {}

  public record Questions(@NotNull @Size(max = 200) List<@Valid Question> questions) {}

  public record Question(
      @NotBlank @Size(max = 80) String id,
      @NotBlank @Size(max = 100) String category,
      @NotBlank @Size(max = 4000) String question,
      @NotNull @Size(max = 12000) String answer,
      @NotNull @Size(max = 20) List<@NotBlank @Size(max = 100) String> keywords,
      @Min(1) @Max(3) int level,
      @Pattern(regexp = "ai|generated|team") String source,
      @Size(max = 500) String from,
      @Size(max = 30) List<@NotBlank @Size(max = 500) String> tasks,
      @Size(max = 30) List<@NotBlank @Size(max = 500) String> apis,
      @Size(max = 100) String erd) {
    public Question(
        String id,
        String category,
        String question,
        String answer,
        List<String> keywords,
        int level,
        String source,
        String from) {
      this(id, category, question, answer, keywords, level, source, from, null, null, null);
    }

    public Question(
        String id,
        String category,
        String question,
        String answer,
        List<String> keywords,
        int level,
        String source) {
      this(id, category, question, answer, keywords, level, source, null);
    }
  }

  public record Evaluation(
      @NotBlank @Size(max = 4000) String question,
      @NotBlank @Size(max = 12000) String answer,
      Boolean followUp) {
    public Evaluation(String question, String answer) {
      this(question, answer, false);
    }
  }

  public record Feedback(
      @Min(0) @Max(100) int score,
      @NotBlank @Size(max = 12000) String feedback,
      @Size(max = 4000) String followUpQuestion) {}
}
