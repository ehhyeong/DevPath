package com.devpath.api.workspace.dto;

import java.util.List;

public record WorkspaceAiDesignResponse(
    String title,
    String summary,
    String difficulty,
    RecommendedStack stack,
    Scenario scenario,
    Architecture architecture,
    List<ApiSpec> apis,
    List<RoadmapPhase> roadmap,
    List<InterviewQuestion> interviewQuestions) {

  public WorkspaceAiDesignResponse withDifficulty(String requestedDifficulty) {
    return new WorkspaceAiDesignResponse(
        title,
        summary,
        requestedDifficulty,
        stack,
        scenario,
        architecture,
        apis,
        roadmap,
        interviewQuestions);
  }

  public record RecommendedStack(
      String frontend,
      String backend,
      String database,
      List<String> libraries,
      String selectionReason) {}

  public record Scenario(
      List<UserFlow> userFlows,
      List<String> coreFeatures,
      List<String> featureIds,
      int nextFeatureNumber) {
    public Scenario {
      // 이전 설계 JSON의 배열 순서를 기존 F 번호로 읽고 이후에는 고정 ID를 저장한다.
      if (featureIds == null && coreFeatures != null) {
        featureIds =
            java.util.stream.IntStream.rangeClosed(1, coreFeatures.size())
                .mapToObj(i -> "F" + i)
                .toList();
      }
      if (nextFeatureNumber <= 0 && coreFeatures != null)
        nextFeatureNumber = coreFeatures.size() + 1;
    }

    public Scenario(List<UserFlow> userFlows, List<String> coreFeatures) {
      this(userFlows, coreFeatures, null, 0);
    }
  }

  public record UserFlow(String actor, String action) {}

  public record Architecture(
      String style,
      String description,
      List<ArchitectureComponent> components,
      String erdMermaid,
      List<DataEntity> entities,
      List<String> technicalChallenges) {}

  public record ArchitectureComponent(String name, String responsibility) {}

  public record DataEntity(String name, String purpose, List<DataColumn> columns) {}

  public record DataColumn(String name, String type, String constraints, String description) {}

  public record ApiSpec(
      String method,
      String path,
      String description,
      String auth,
      String requestExample,
      String responseExample,
      String group) {}

  public record RoadmapPhase(
      int phase, String title, String goal, int estimatedWeeks, List<String> tasks) {}

  public record InterviewQuestion(
      String category,
      String question,
      String answer,
      List<String> keywords,
      List<String> tasks,
      List<String> apis,
      String erd) {}
}
