package com.devpath.api.workspace.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.util.List;

public record WorkspaceAiDesignEditRequest(
    @NotNull WorkspaceAiDesignResponse expectedDesign,
    @Valid Planning planning,
    @Valid Architecture architecture,
    @Size(min = 1, max = 30) List<@NotNull @Valid Phase> roadmap) {
  @AssertTrue(message = "수정할 설계 영역을 하나만 선택해 주세요.")
  public boolean isSingleSection() {
    return (planning == null ? 0 : 1) + (architecture == null ? 0 : 1) + (roadmap == null ? 0 : 1)
        == 1;
  }

  public record Planning(
      @NotBlank @Size(max = 180) String title,
      @NotBlank @Size(max = 5000) String summary,
      @NotNull @Size(min = 1, max = 50) List<@NotNull @Valid Flow> userFlows,
      @NotNull @Size(min = 1, max = 100) List<@NotNull @Valid Feature> features) {}

  public record Flow(
      @NotBlank @Size(max = 100) String actor, @NotBlank @Size(max = 5000) String action) {}

  public record Feature(@Size(max = 20) String id, @NotBlank @Size(max = 1000) String title) {}

  public record Architecture(
      @NotBlank @Size(max = 200) String frontend,
      @NotBlank @Size(max = 200) String backend,
      @NotBlank @Size(max = 200) String database,
      @NotNull @Size(max = 50) List<@NotBlank @Size(max = 200) String> libraries,
      @NotBlank @Size(max = 5000) String selectionReason,
      @NotBlank @Size(max = 200) String style,
      @NotBlank @Size(max = 10000) String description,
      @NotNull @Size(max = 50) List<@NotNull @Valid Component> components,
      @NotNull @Size(max = 50) List<@NotBlank @Size(max = 5000) String> technicalChallenges) {}

  public record Component(
      @NotBlank @Size(max = 200) String name, @NotBlank @Size(max = 5000) String responsibility) {}

  public record Phase(
      @Positive int phase,
      @NotBlank @Size(max = 200) String title,
      @NotBlank @Size(max = 5000) String goal,
      @NotNull @Size(max = 100) List<@NotBlank @Size(max = 1000) String> tasks) {}
}
