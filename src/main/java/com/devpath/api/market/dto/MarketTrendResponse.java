package com.devpath.api.market.dto;

import com.devpath.domain.market.model.AdminMarketReport;
import com.devpath.domain.market.model.MarketIndicator;
import com.devpath.domain.market.model.MarketJobTrend;
import com.devpath.domain.market.model.MarketSkillStackTrend;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import java.util.List;

public class MarketTrendResponse {

  private MarketTrendResponse() {}

  @Schema(name = "MarketSkillStackTrendResponse", description = "시장 인기 기술 스택 통계 응답")
  public record SkillStackTrend(
      @Schema(description = "기술 스택명", example = "Spring Boot") String skillName,
      @Schema(description = "해당 기술이 등장한 공고 수", example = "12") Long postingCount) {

    public static SkillStackTrend from(MarketSkillStackTrend trend) {
      return new SkillStackTrend(trend.skillName(), trend.postingCount());
    }
  }

  @Schema(name = "MarketJobTrendResponse", description = "직무별 채용 트렌드 응답")
  public record JobTrend(
      @Schema(description = "직무명", example = "Backend Developer") String jobRole,
      @Schema(description = "직무별 공고 수", example = "8") Long postingCount) {

    public static JobTrend from(MarketJobTrend trend) {
      return new JobTrend(trend.jobRole(), trend.postingCount());
    }
  }

  @Schema(name = "MarketIndicatorResponse", description = "시장 트렌드 지표 응답")
  public record Indicator(
      @Schema(description = "지표 타입", example = "REGION") String type,
      @Schema(description = "지표 라벨", example = "SEOUL") String label,
      @Schema(description = "공고 수", example = "15") Long postingCount) {

    public static Indicator from(MarketIndicator indicator) {
      return new Indicator(indicator.type(), indicator.label(), indicator.postingCount());
    }
  }

  @Schema(name = "AdminMarketReportResponse", description = "관리자 채용 분석 리포트 응답")
  public record AdminReport(
      @Schema(description = "전체 공고 수", example = "30") Long totalPostingCount,
      @Schema(description = "OPEN 공고 수", example = "20") Long openPostingCount,
      @Schema(description = "CLOSED 공고 수", example = "7") Long closedPostingCount,
      @Schema(description = "DRAFT 공고 수", example = "3") Long draftPostingCount,
      @Schema(description = "분석된 기술 태그 수", example = "52") Long analyzedSkillTagCount,
      @Schema(
              description = "상위 인기 기술 스택",
              example = "[{\"skillName\":\"Spring Boot\",\"postingCount\":12}]")
          List<SkillStackTrend> topSkills,
      @Schema(
              description = "상위 직무 트렌드",
              example = "[{\"jobRole\":\"Backend Developer\",\"postingCount\":8}]")
          List<JobTrend> topJobRoles,
      @Schema(
              description = "지역별/경력별 지표",
              example = "[{\"type\":\"REGION\",\"label\":\"SEOUL\",\"postingCount\":15}]")
          List<Indicator> indicators,
      @Schema(description = "리포트 생성 일시", example = "2026-05-06T14:00:00")
          LocalDateTime generatedAt) {

    public static AdminReport from(AdminMarketReport report) {
      return new AdminReport(
          report.totalPostingCount(),
          report.openPostingCount(),
          report.closedPostingCount(),
          report.draftPostingCount(),
          report.analyzedSkillTagCount(),
          report.topSkills().stream().map(SkillStackTrend::from).toList(),
          report.topJobRoles().stream().map(JobTrend::from).toList(),
          report.indicators().stream().map(Indicator::from).toList(),
          report.generatedAt());
    }
  }
}
