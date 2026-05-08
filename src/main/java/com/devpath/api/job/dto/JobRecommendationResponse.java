package com.devpath.api.job.dto;

import com.devpath.domain.job.entity.JobPosting;
import com.devpath.domain.job.entity.JobPostingStatus;
import com.devpath.domain.job.entity.JobSource;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDate;
import java.util.List;

public class JobRecommendationResponse {

  private JobRecommendationResponse() {}

  @Schema(name = "JobRecommendationResponse", description = "학습자 추천 공고 응답")
  public record Recommendation(
      @Schema(description = "채용 공고 ID", example = "1") Long jobId,
      @Schema(description = "기업 ID", example = "1") Long companyId,
      @Schema(description = "기업명", example = "DevPath Labs") String companyName,
      @Schema(description = "공고 제목", example = "백엔드 주니어 개발자 채용") String title,
      @Schema(description = "직무명", example = "Backend Developer") String jobRole,
      @Schema(description = "요구 기술 스택", example = "Java, Spring Boot, JPA, PostgreSQL")
          String requiredSkills,
      @Schema(description = "근무 지역", example = "SEOUL") String region,
      @Schema(description = "경력 조건", example = "JUNIOR") String careerLevel,
      @Schema(description = "원문 공고 URL", example = "https://jobs.example.com/postings/1")
          String sourceUrl,
      @Schema(description = "공고 출처", example = "INTERNAL") JobSource source,
      @Schema(description = "공고 상태", example = "OPEN") JobPostingStatus status,
      @Schema(description = "마감일", example = "2026-06-30") LocalDate deadline,
      @Schema(description = "추천 점수", example = "35") Integer recommendationScore,
      @Schema(description = "매칭된 기술 태그 목록", example = "[\"Java\", \"Spring Boot\"]")
          List<String> matchedSkillTags,
      @Schema(description = "추천 사유", example = "보유/검증/로드맵 스킬과 2개 기술이 일치합니다.") String reason) {

    public static Recommendation from(
        JobPosting jobPosting, Integer recommendationScore, List<String> matchedSkillTags) {
      return new Recommendation(
          jobPosting.getId(),
          jobPosting.getCompany().getId(),
          jobPosting.getCompany().getName(),
          jobPosting.getTitle(),
          jobPosting.getJobRole(),
          jobPosting.getRequiredSkills(),
          jobPosting.getRegion(),
          jobPosting.getCareerLevel(),
          jobPosting.getSourceUrl(),
          jobPosting.getSource(),
          jobPosting.getStatus(),
          jobPosting.getDeadline(),
          recommendationScore,
          matchedSkillTags,
          buildReason(matchedSkillTags));
    }

    private static String buildReason(List<String> matchedSkillTags) {
      if (matchedSkillTags.isEmpty()) {
        return "지역/경력 조건에 맞는 공개 채용 공고입니다.";
      }

      return "보유/검증/로드맵 스킬과 " + matchedSkillTags.size() + "개 기술이 일치합니다.";
    }
  }
}
