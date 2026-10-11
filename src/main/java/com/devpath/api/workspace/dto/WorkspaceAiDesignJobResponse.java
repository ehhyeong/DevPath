package com.devpath.api.workspace.dto;

import java.time.Instant;

public record WorkspaceAiDesignJobResponse(
    String jobId,
    String status,
    WorkspaceAiDesignResponse result,
    String errorMessage,
    Instant createdAt,
    Instant completedAt) {}
