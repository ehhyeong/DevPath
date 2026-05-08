package com.devpath.api.market.service;

import com.devpath.api.market.dto.MarketTrendResponse;
import com.devpath.domain.job.entity.JobPostingStatus;
import com.devpath.domain.job.repository.JobPostingRepository;
import com.devpath.domain.job.repository.JobSkillTagRepository;
import com.devpath.domain.market.model.AdminMarketReport;
import com.devpath.domain.market.model.MarketIndicator;
import com.devpath.domain.market.model.MarketJobTrend;
import com.devpath.domain.market.model.MarketSkillStackTrend;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Stream;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MarketTrendService {

  private static final int ADMIN_REPORT_TOP_LIMIT = 10;

  private final JobPostingRepository jobPostingRepository;
  private final JobSkillTagRepository jobSkillTagRepository;

  public List<MarketTrendResponse.SkillStackTrend> getStackTrends() {
    return findSkillStackTrends().stream().map(MarketTrendResponse.SkillStackTrend::from).toList();
  }

  public List<MarketTrendResponse.JobTrend> getJobTrends() {
    return findJobTrends().stream().map(MarketTrendResponse.JobTrend::from).toList();
  }

  public List<MarketTrendResponse.Indicator> getIndicators() {
    return findIndicators().stream().map(MarketTrendResponse.Indicator::from).toList();
  }

  public MarketTrendResponse.AdminReport getAdminReport() {
    AdminMarketReport report =
        new AdminMarketReport(
            jobPostingRepository.countByIsDeletedFalse(),
            jobPostingRepository.countByStatusAndIsDeletedFalse(JobPostingStatus.OPEN),
            jobPostingRepository.countByStatusAndIsDeletedFalse(JobPostingStatus.CLOSED),
            jobPostingRepository.countByStatusAndIsDeletedFalse(JobPostingStatus.DRAFT),
            jobSkillTagRepository.countByIsDeletedFalse(),
            limit(findSkillStackTrends()),
            limit(findJobTrends()),
            findIndicators(),
            LocalDateTime.now());

    return MarketTrendResponse.AdminReport.from(report);
  }

  private List<MarketSkillStackTrend> findSkillStackTrends() {
    return jobSkillTagRepository.findPopularSkillTags().stream()
        .map(
            projection ->
                new MarketSkillStackTrend(projection.getTagName(), projection.getUsageCount()))
        .toList();
  }

  private List<MarketJobTrend> findJobTrends() {
    return jobPostingRepository.findJobRoleTrends().stream()
        .map(
            projection -> new MarketJobTrend(projection.getJobRole(), projection.getPostingCount()))
        .toList();
  }

  private List<MarketIndicator> findIndicators() {
    List<MarketIndicator> regionIndicators =
        jobPostingRepository.findRegionIndicators().stream()
            .map(
                projection ->
                    new MarketIndicator(
                        "REGION", projection.getLabel(), projection.getPostingCount()))
            .toList();

    List<MarketIndicator> careerLevelIndicators =
        jobPostingRepository.findCareerLevelIndicators().stream()
            .map(
                projection ->
                    new MarketIndicator(
                        "CAREER_LEVEL", projection.getLabel(), projection.getPostingCount()))
            .toList();

    return Stream.concat(regionIndicators.stream(), careerLevelIndicators.stream()).toList();
  }

  private <T> List<T> limit(List<T> values) {
    return values.stream().limit(ADMIN_REPORT_TOP_LIMIT).toList();
  }
}
