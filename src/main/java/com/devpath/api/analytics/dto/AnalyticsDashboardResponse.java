package com.devpath.api.analytics.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@Schema(description = "관리자 데이터 분석 대시보드 요약 DTO")
public class AnalyticsDashboardResponse {

  @Schema(description = "총 가입자 수", example = "15000")
  private long totalUsers;

  @Schema(description = "주간 활성 사용자 수 (WAU)", example = "4200")
  private long weeklyActiveUsers;

  @Schema(description = "평균 로드맵 진행률 (%)", example = "45.5")
  private double averageRoadmapProgress;

  @Schema(description = "이번 달 완료된 과제 수", example = "1250")
  private long monthlyCompletedAssignments;
}
