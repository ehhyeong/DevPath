package com.devpath.api.admin.dto.system;

import java.time.LocalDateTime;

public record SystemHealthResponse(
    String status,
    String database,
    DependencyStatus jobkorea,
    DependencyStatus gemini,
    DependencyStatus ffmpeg,
    LocalDateTime checkedAt) {

  public record DependencyStatus(String status, String message) {}
}
