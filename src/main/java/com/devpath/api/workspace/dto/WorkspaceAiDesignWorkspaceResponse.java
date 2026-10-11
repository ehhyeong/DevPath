package com.devpath.api.workspace.dto;

import java.time.Instant;

public record WorkspaceAiDesignWorkspaceResponse(
    Long workspaceId, String dashboardUrl, Instant createdAt, WorkspaceAiDesignResponse design) {}
