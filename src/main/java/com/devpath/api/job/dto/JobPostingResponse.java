package com.devpath.api.job.dto;

import com.devpath.domain.job.entity.JobPosting;
import com.devpath.domain.job.entity.JobPostingStatus;
import com.devpath.domain.job.entity.JobSource;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDate;
import java.time.LocalDateTime;

public class JobPostingResponse {

  private JobPostingResponse() {}

  @Schema(name = "JobPostingSummaryResponse", description = "채용 공고 목록 응답")
  public record Summary(
      @Schema(description = "채용 공고 ID", example = "1") Long jobId,
      @Schema(description = "기업 ID", example = "1") Long companyId,
      @Schema(description = "기업명", example = "DevPath Labs") String companyName,
      @Schema(description = "공고 제목", example = "백엔드 주니어 개발자 채용") String title,
      @Schema(description = "직무명", example = "Backend Developer") String jobRole,
      @Schema(description = "요구 기술 스택", example = "Java, Spring Boot, JPA") String requiredSkills,
      @Schema(description = "근무 지역", example = "SEOUL") String region,
      @Schema(description = "경력 조건", example = "JUNIOR") String careerLevel,
      @Schema(description = "공고 출처", example = "INTERNAL") JobSource source,
      @Schema(description = "공고 상태", example = "OPEN") JobPostingStatus status,
      @Schema(description = "보관 여부") Boolean archived,
      @Schema(description = "마감일", example = "2026-06-30") LocalDate deadline,
      @Schema(description = "생성일시", example = "2026-05-06T12:20:00") LocalDateTime createdAt) {

    public static Summary from(JobPosting jobPosting) {
      return new Summary(
          jobPosting.getId(),
          jobPosting.getCompany().getId(),
          jobPosting.getCompany().getName(),
          jobPosting.getTitle(),
          jobPosting.getJobRole(),
          jobPosting.getRequiredSkills(),
          jobPosting.getRegion(),
          jobPosting.getCareerLevel(),
          jobPosting.getSource(),
          jobPosting.getStatus(),
          jobPosting.getIsDeleted(),
          jobPosting.getDeadline(),
          jobPosting.getCreatedAt());
    }
  }

  @Schema(name = "JobPostingDetailResponse", description = "채용 공고 상세 응답")
  public record Detail(
      @Schema(description = "채용 공고 ID", example = "1") Long jobId,
      @Schema(description = "기업 ID", example = "1") Long companyId,
      @Schema(description = "기업명", example = "DevPath Labs") String companyName,
      @Schema(description = "공고 제목", example = "백엔드 주니어 개발자 채용") String title,
      @Schema(description = "직무명", example = "Backend Developer") String jobRole,
      @Schema(description = "공고 설명", example = "Spring Boot 기반 백엔드 API 개발자를 채용합니다.")
          String description,
      @Schema(description = "요구 기술 스택", example = "Java, Spring Boot, JPA, PostgreSQL")
          String requiredSkills,
      @Schema(description = "근무 지역", example = "SEOUL") String region,
      @Schema(description = "경력 조건", example = "JUNIOR") String careerLevel,
      @Schema(description = "원문 공고 URL", example = "https://jobs.example.com/postings/1")
          String sourceUrl,
      @Schema(description = "공고 출처", example = "INTERNAL") JobSource source,
      @Schema(description = "공고 상태", example = "OPEN") JobPostingStatus status,
      @Schema(description = "마감일", example = "2026-06-30") LocalDate deadline,
      @Schema(description = "외부 플랫폼 공고 ID", example = "wanted-12345") String externalJobId,
      @Schema(description = "보관 여부") Boolean archived,
      @Schema(description = "생성일시", example = "2026-05-06T12:20:00") LocalDateTime createdAt,
      @Schema(description = "수정일시", example = "2026-05-06T12:30:00") LocalDateTime updatedAt) {

    public static Detail from(JobPosting jobPosting) {
      return new Detail(
          jobPosting.getId(),
          jobPosting.getCompany().getId(),
          jobPosting.getCompany().getName(),
          jobPosting.getTitle(),
          jobPosting.getJobRole(),
          jobPosting.getDescription(),
          jobPosting.getRequiredSkills(),
          jobPosting.getRegion(),
          jobPosting.getCareerLevel(),
          jobPosting.getSourceUrl(),
          jobPosting.getSource(),
          jobPosting.getStatus(),
          jobPosting.getDeadline(),
          jobPosting.getExternalJobId(),
          jobPosting.getIsDeleted(),
          jobPosting.getCreatedAt(),
          jobPosting.getUpdatedAt());
    }
  }

  @Schema(name = "JobCollectResponse", description = "채용 데이터 수집 결과 응답")
  public record CollectResult(
      @Schema(description = "수집 소스", example = "WANTED") JobSource source,
      @Schema(description = "수집 키워드", example = "Spring Boot") String keyword,
      @Schema(description = "수집 요청 개수", example = "20") Integer requestedCount,
      @Schema(description = "신규 적재 개수", example = "0") Integer savedCount,
      @Schema(description = "중복 스킵 개수", example = "0") Integer skippedCount,
      @Schema(description = "수집 상태", example = "COMPLETED") String status,
      @Schema(description = "수집 메시지", example = "외부 API 어댑터 미연결 상태입니다. 요청은 정상 처리되었습니다.")
          String message,
      @Schema(description = "수집 처리 일시", example = "2026-05-06T12:40:00")
          LocalDateTime collectedAt) {

    public static CollectResult completed(
        JobSource source,
        String keyword,
        Integer requestedCount,
        int savedCount,
        int skippedCount) {
      return new CollectResult(
          source,
          keyword,
          requestedCount,
          savedCount,
          skippedCount,
          "COMPLETED",
          "외부 채용 공고를 수집해 저장했습니다.",
          LocalDateTime.now());
    }
  }
}
