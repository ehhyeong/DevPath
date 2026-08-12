package com.devpath.api.job.dto;

import com.devpath.domain.job.entity.Company;
import com.devpath.domain.job.entity.CompanyVerificationStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;

public class CompanyResponse {

  private CompanyResponse() {}

  @Schema(name = "CompanySummaryResponse", description = "기업 목록 응답")
  public record Summary(
      @Schema(description = "기업 ID", example = "1") Long companyId,
      @Schema(description = "기업명", example = "DevPath Labs") String name,
      @Schema(description = "산업군", example = "EdTech") String industry,
      @Schema(description = "기업 위치", example = "서울") String location,
      @Schema(description = "기업 인증 상태", example = "PENDING")
          CompanyVerificationStatus verificationStatus,
      @Schema(description = "보관 여부") Boolean archived,
      @Schema(description = "생성일시", example = "2026-05-06T12:00:00") LocalDateTime createdAt) {

    public static Summary from(Company company) {
      return new Summary(
          company.getId(),
          company.getName(),
          company.getIndustry(),
          company.getLocation(),
          company.getVerificationStatus(),
          company.getIsDeleted(),
          company.getCreatedAt());
    }
  }

  @Schema(name = "CompanyDetailResponse", description = "기업 상세 응답")
  public record Detail(
      @Schema(description = "기업 ID", example = "1") Long companyId,
      @Schema(description = "기업명", example = "DevPath Labs") String name,
      @Schema(description = "기업 소개", example = "개발자 성장 플랫폼을 만드는 스타트업입니다.") String description,
      @Schema(description = "기업 홈페이지 URL", example = "https://devpath.example.com")
          String websiteUrl,
      @Schema(description = "기업 로고 URL", example = "https://cdn.example.com/logo.png")
          String logoUrl,
      @Schema(description = "산업군", example = "EdTech") String industry,
      @Schema(description = "기업 위치", example = "서울") String location,
      @Schema(description = "기업 인증 상태", example = "VERIFIED")
          CompanyVerificationStatus verificationStatus,
      @Schema(description = "인증 처리 메모", example = "사업자 정보 확인 완료") String verificationMemo,
      @Schema(description = "인증 처리 일시", example = "2026-05-06T12:10:00") LocalDateTime verifiedAt,
      @Schema(description = "보관 여부") Boolean archived,
      @Schema(description = "생성일시", example = "2026-05-06T12:00:00") LocalDateTime createdAt,
      @Schema(description = "수정일시", example = "2026-05-06T12:10:00") LocalDateTime updatedAt) {

    public static Detail from(Company company) {
      return new Detail(
          company.getId(),
          company.getName(),
          company.getDescription(),
          company.getWebsiteUrl(),
          company.getLogoUrl(),
          company.getIndustry(),
          company.getLocation(),
          company.getVerificationStatus(),
          company.getVerificationMemo(),
          company.getVerifiedAt(),
          company.getIsDeleted(),
          company.getCreatedAt(),
          company.getUpdatedAt());
    }
  }
}
