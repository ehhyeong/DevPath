package com.devpath.api.resume.dto;

import com.devpath.domain.resume.model.ResumeClinicGeneratedContent;
import com.devpath.domain.resume.model.ResumeClinicSourceType;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

public class ResumeClinicResponse {

  private ResumeClinicResponse() {}

  @Schema(name = "ResumeStrengthSummaryResponse", description = "강점 요약 응답")
  public record StrengthSummary(
      @Schema(description = "목표 직무", example = "Backend Developer") String targetRole,
      @Schema(description = "핵심 기술 스택", example = "[\"Java\", \"Spring Boot\", \"JPA\"]")
          List<String> skills,
      @Schema(description = "학습 이력 기반 강점 요약", example = "Spring Boot와 JPA 학습 이력이 탄탄합니다.")
          String learningStrengthSummary,
      @Schema(description = "프로젝트 이력 기반 강점 요약", example = "프로젝트에서 REST API 설계와 인증 기능을 구현했습니다.")
          String projectStrengthSummary,
      @Schema(description = "Proof Card 기반 강점 요약", example = "PR 리뷰 통과 이력으로 구현 역량을 증명했습니다.")
          String proofCardStrengthSummary,
      @Schema(description = "종합 강점 요약", example = "백엔드 API 설계와 데이터 모델링에 강점이 있습니다.")
          String overallSummary,
      @Schema(description = "추천 키워드", example = "[\"Java\", \"Spring Boot\", \"JPA\"]")
          List<String> recommendedKeywords) {}

  @Schema(name = "ResumeHighlightPointsResponse", description = "이력서 강조 포인트 응답")
  public record HighlightPoints(
      @Schema(description = "목표 직무", example = "Backend Developer") String targetRole,
      @Schema(description = "강조 포인트 목록", example = "[\"REST API 설계\", \"JPA 데이터 모델링\"]")
          List<String> highlightPoints,
      @Schema(description = "이력서 bullet 문구 목록", example = "[\"Spring Boot 기반 인증 API를 구현했습니다.\"]")
          List<String> bulletPoints,
      @Schema(description = "매칭 키워드", example = "[\"REST API\", \"Spring Security\"]")
          List<String> matchedKeywords) {}

  @Schema(name = "PortfolioPhrasesResponse", description = "포트폴리오 추천 문구 응답")
  public record PortfolioPhrases(
      @Schema(description = "포트폴리오 헤드라인", example = "문제 해결 중심의 백엔드 개발자") String headline,
      @Schema(
              description = "포트폴리오 소개 문구",
              example = "Spring Boot 기반 API 설계와 JPA 데이터 모델링에 강점이 있습니다.")
          String introduction,
      @Schema(description = "프로젝트 설명 문구", example = "[\"DevPath에서 멘토링 API와 PR 리뷰 흐름을 구현했습니다.\"]")
          List<String> projectPhrases,
      @Schema(description = "Proof Card 설명 문구", example = "[\"Spring Boot 미션 통과로 구현 역량을 검증했습니다.\"]")
          List<String> proofCardPhrases,
      @Schema(description = "마무리 문구", example = "[\"사용자 성장과 채용 연결에 기여하는 백엔드 개발자가 되겠습니다.\"]")
          List<String> closingPhrases) {}

  @Schema(name = "ResumeGeneratedContentResponse", description = "생성 문구 공통 응답")
  public record GeneratedContent(
      @Schema(description = "문구 출처 타입", example = "PROJECT") ResumeClinicSourceType sourceType,
      @Schema(description = "문구 제목", example = "프로젝트 기반 강점") String title,
      @Schema(description = "생성 문구", example = "Spring Boot 기반 API 설계 경험을 갖춘 백엔드 개발자입니다.")
          String content,
      @Schema(description = "관련 키워드", example = "[\"Spring Boot\", \"JPA\"]")
          List<String> keywords) {

    public static GeneratedContent from(ResumeClinicGeneratedContent content) {
      return new GeneratedContent(
          content.sourceType(), content.title(), content.content(), content.keywords());
    }
  }
}
