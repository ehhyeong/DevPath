package com.devpath.api.report.dto;

import com.devpath.domain.admin.entity.ModerationReport;
import java.time.LocalDateTime;

public record ReportCreateResponse(
    Long reportId,
    ReportTargetType targetType,
    Long targetId,
    String status,
    LocalDateTime createdAt) {

  public static ReportCreateResponse from(
      ModerationReport report, ReportTargetType targetType, Long targetId) {
    return new ReportCreateResponse(
        report.getId(), targetType, targetId, report.getStatus().name(), report.getCreatedAt());
  }
}
