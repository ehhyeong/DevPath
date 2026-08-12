package com.devpath.api.admin.dto.moderation;

import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
// 신고 접수 목록에서 보여주는 관리자 검수 대상 요약이다.
public class ModerationReportSummaryResponse {

  private Long reportId;
  private String targetType;
  private Long targetId;
  private Long contentId;
  private String targetLabel;
  private String targetSummary;
  private String reporterName;
  private String reporterEmail;
  private String targetUserName;
  private String targetUserEmail;
  private String contentTitle;
  private String contentPreview;
  private String reason;
  private String status;
  private boolean blinded;
  private String actionTaken;
  private String resolutionReason;
  private Long resolvedBy;
  private LocalDateTime resolvedAt;
  private LocalDateTime createdAt;
}
