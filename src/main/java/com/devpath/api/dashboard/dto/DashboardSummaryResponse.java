package com.devpath.api.dashboard.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@Schema(description = "학습자 대시보드 요약 응답 DTO")
public class DashboardSummaryResponse {

  @Schema(description = "총 학습 시간 (시간 단위)", example = "120")
  private Integer totalStudyHours;

  @Schema(description = "클리어한 총 노드 수", example = "15")
  private Integer completedNodes;

  @Schema(description = "현재 유지 중인 스트릭(연속 학습) 일수", example = "7")
  private Integer currentStreak;

  @Schema(description = "어제 대비 오늘 학습 증가량 (분 단위, null이면 비표시)", example = "45")
  private Integer studyHoursDeltaMinutes;

  @Schema(
      description = "가장 최근 수강한 레슨 정보 (섹션명 - N강. 레슨명)",
      example = "섹션 2. 스프링 기초 - 3강. DI와 IoC 컨테이너")
  private String lastLessonInfo;
}
