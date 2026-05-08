package com.devpath.api.resume.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class ResumeClinicRequest {

  private ResumeClinicRequest() {}

  @Schema(name = "ResumeStrengthSummaryRequest", description = "학습/프로젝트/Proof Card 기반 강점 요약 요청")
  public record StrengthSummary(
      @Schema(description = "목표 직무", example = "Backend Developer")
          @NotBlank(message = "목표 직무는 필수입니다.")
          @Size(max = 100, message = "목표 직무는 100자 이하여야 합니다.")
          String targetRole,
      @Schema(description = "보유 기술 스택", example = "Java, Spring Boot, JPA, PostgreSQL")
          @NotBlank(message = "보유 기술 스택은 필수입니다.")
          @Size(max = 1000, message = "보유 기술 스택은 1000자 이하여야 합니다.")
          String skills,
      @Schema(
              description = "학습 이력",
              example = "Spring Boot JWT 인증, JPA 연관관계, PostgreSQL 기반 API 개발을 학습했습니다.")
          @Size(max = 3000, message = "학습 이력은 3000자 이하여야 합니다.")
          String learningHistory,
      @Schema(description = "프로젝트 이력", example = "DevPath에서 멘토링, PR 리뷰, 채용 공고 분석 API를 구현했습니다.")
          @Size(max = 3000, message = "프로젝트 이력은 3000자 이하여야 합니다.")
          String projectExperience,
      @Schema(description = "Proof Card 이력", example = "멘토링 미션 완료, PR 리뷰 통과, AI 코드 리뷰 개선 반영")
          @Size(max = 3000, message = "Proof Card 이력은 3000자 이하여야 합니다.")
          String proofCards) {}

  @Schema(name = "ResumeHighlightPointsRequest", description = "이력서 강조 포인트 추천 요청")
  public record HighlightPoints(
      @Schema(description = "목표 직무", example = "Backend Developer")
          @NotBlank(message = "목표 직무는 필수입니다.")
          @Size(max = 100, message = "목표 직무는 100자 이하여야 합니다.")
          String targetRole,
      @Schema(description = "보유 기술 스택", example = "Java, Spring Boot, JPA, Redis, PostgreSQL")
          @NotBlank(message = "보유 기술 스택은 필수입니다.")
          @Size(max = 1000, message = "보유 기술 스택은 1000자 이하여야 합니다.")
          String skills,
      @Schema(description = "프로젝트 경험", example = "멘토링 신청 승인, PR 리뷰, 회의 출석, 채용 공고 추천 API를 구현했습니다.")
          @NotBlank(message = "프로젝트 경험은 필수입니다.")
          @Size(max = 3000, message = "프로젝트 경험은 3000자 이하여야 합니다.")
          String projectExperience,
      @Schema(description = "Proof Card 이력", example = "주차별 미션 통과, 코드 리뷰 승인, Proof Card 발급")
          @Size(max = 3000, message = "Proof Card 이력은 3000자 이하여야 합니다.")
          String proofCards,
      @Schema(description = "채용 키워드", example = "REST API, Spring Security, JPA, PostgreSQL")
          @Size(max = 1000, message = "채용 키워드는 1000자 이하여야 합니다.")
          String jobKeywords) {}

  @Schema(name = "PortfolioPhraseRequest", description = "포트폴리오 추천 문구 생성 요청")
  public record PortfolioPhrases(
      @Schema(description = "프로필 제목", example = "문제 해결 중심의 백엔드 개발자")
          @NotBlank(message = "프로필 제목은 필수입니다.")
          @Size(max = 150, message = "프로필 제목은 150자 이하여야 합니다.")
          String profileTitle,
      @Schema(description = "목표 직무", example = "Backend Developer")
          @NotBlank(message = "목표 직무는 필수입니다.")
          @Size(max = 100, message = "목표 직무는 100자 이하여야 합니다.")
          String targetRole,
      @Schema(description = "보유 기술 스택", example = "Java, Spring Boot, JPA, PostgreSQL, Docker")
          @NotBlank(message = "보유 기술 스택은 필수입니다.")
          @Size(max = 1000, message = "보유 기술 스택은 1000자 이하여야 합니다.")
          String skills,
      @Schema(
              description = "대표 프로젝트 경험",
              example = "DevPath에서 멘토링, 실시간 알림, AI 리뷰, 채용 분석 API를 구현했습니다.")
          @NotBlank(message = "대표 프로젝트 경험은 필수입니다.")
          @Size(max = 3000, message = "대표 프로젝트 경험은 3000자 이하여야 합니다.")
          String projectExperience,
      @Schema(description = "Proof Card 이력", example = "미션 통과, PR 리뷰 승인, 회의 요약 저장 기능 구현")
          @Size(max = 3000, message = "Proof Card 이력은 3000자 이하여야 합니다.")
          String proofCards) {}
}
