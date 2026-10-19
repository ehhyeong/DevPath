package com.devpath.api.workspace.dto;

import java.time.Instant;

public record WorkspaceAiDesignWorkspaceResponse(
    Long workspaceId,
    String dashboardUrl,
    Instant createdAt,
    WorkspaceAiDesignResponse design,
    boolean demoWorkspace) {
  public WorkspaceAiDesignWorkspaceResponse(
      Long workspaceId, String dashboardUrl, Instant createdAt, WorkspaceAiDesignResponse design) {
    this(workspaceId, dashboardUrl, createdAt, design, false);
  }
}
