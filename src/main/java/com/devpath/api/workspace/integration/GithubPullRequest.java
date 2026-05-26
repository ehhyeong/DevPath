package com.devpath.api.workspace.integration;

import java.time.LocalDateTime;

public record GithubPullRequest(
    long number,
    String title,
    String body,
    String htmlUrl,
    String state,
    String authorLogin,
    String authorAvatarUrl,
    String sourceBranch,
    String targetBranch,
    String filePath,
    String diffText,
    int additions,
    int deletions,
    LocalDateTime createdAt,
    LocalDateTime updatedAt,
    LocalDateTime mergedAt) {

  public String externalId(GithubRepositoryReference repository) {
    return repository.owner() + "/" + repository.name() + "#" + number;
  }

  public String reviewStatus() {
    if ("open".equalsIgnoreCase(state)) {
      return "OPEN";
    }

    return mergedAt == null ? "CLOSED" : "MERGED";
  }
}
