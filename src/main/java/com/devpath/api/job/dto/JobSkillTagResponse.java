package com.devpath.api.job.dto;

import com.devpath.domain.job.entity.JobSkillTag;
import com.devpath.domain.job.entity.JobSkillTagSource;
import com.devpath.domain.job.repository.JobSkillTagRepository;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import java.util.List;

public class JobSkillTagResponse {

  private JobSkillTagResponse() {}

  @Schema(name = "JobSkillTagDetailResponse", description = "채용 공고 기술 태그 응답")
  public record Detail(
      @Schema(description = "기술 태그 ID", example = "1") Long skillTagId,
      @Schema(description = "채용 공고 ID", example = "1") Long jobId,
      @Schema(description = "기술 태그명", example = "Spring Boot") String name,
      @Schema(description = "태그 추출 방식", example = "JD_RULE_BASED") JobSkillTagSource source,
      @Schema(description = "신뢰도", example = "0.95") Double confidenceScore,
      @Schema(description = "매칭 키워드", example = "spring boot") String matchedKeyword,
      @Schema(description = "생성일시", example = "2026-05-06T13:00:00") LocalDateTime createdAt) {

    public static Detail from(JobSkillTag tag) {
      return new Detail(
          tag.getId(),
          tag.getJobPosting().getId(),
          tag.getName(),
          tag.getSource(),
          tag.getConfidenceScore(),
          tag.getMatchedKeyword(),
          tag.getCreatedAt());
    }
  }

  @Schema(name = "JobJdAnalysisResponse", description = "JD 분석 결과 응답")
  public record AnalysisResult(
      @Schema(description = "채용 공고 ID", example = "1") Long jobId,
      @Schema(description = "공고 제목", example = "백엔드 주니어 개발자 채용") String jobTitle,
      @Schema(description = "추출된 태그 개수", example = "5") Integer extractedCount,
      @Schema(description = "분석 메시지", example = "JD 분석이 완료되었습니다.") String message,
      @Schema(
              description = "추출된 기술 태그 목록",
              example = "[{\"skillTagId\":1,\"name\":\"Spring Boot\"}]")
          List<Detail> skillTags) {

    public static AnalysisResult of(Long jobId, String jobTitle, List<JobSkillTag> tags) {
      return new AnalysisResult(
          jobId,
          jobTitle,
          tags.size(),
          "JD 분석이 완료되었습니다.",
          tags.stream().map(Detail::from).toList());
    }
  }

  @Schema(name = "PopularJobSkillTagResponse", description = "인기 기술 태그 응답")
  public record Popular(
      @Schema(description = "기술 태그명", example = "Spring Boot") String tagName,
      @Schema(description = "등장 횟수", example = "12") Long usageCount) {

    public static Popular from(JobSkillTagRepository.PopularSkillTagProjection projection) {
      return new Popular(projection.getTagName(), projection.getUsageCount());
    }
  }
}
