package com.devpath.api.workspace.integration;

import java.time.LocalDateTime;
import java.util.List;

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
    List<FileChange> files,
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

  public List<FileChange> normalizedFiles() {
    if (files != null && !files.isEmpty()) {
      return files;
    }

    return List.of(new FileChange(filePath, diffText, additions, deletions, "modified"));
  }

  public record FileChange(
      String filePath, String diffText, int additions, int deletions, String changeType) {}
}
