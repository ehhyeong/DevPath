package com.devpath.api.job.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDate;
import java.util.List;

public class GeminiJobAnalysisResponse {

  private GeminiJobAnalysisResponse() {}

  @Schema(name = "GeminiJobAnalysisResponse", description = "Gemini AI 기반 채용공고 분석 결과")
  public record Analysis(
      @Schema(description = "AI가 분석한 추천 공고 목록") List<RecommendedPosting> recommendations,
      @Schema(description = "Gemini AI 분석 성공 여부", example = "true") boolean aiAnalyzed,
      @Schema(description = "분석 비고 (실패 사유 등)") String analysisNote) {}

  @Schema(name = "GeminiRecommendedPosting", description = "Gemini AI 점수가 부여된 잡코리아 채용공고")
  public record RecommendedPosting(
      @Schema(description = "잡코리아 채용공고 고유번호", example = "23592012") String externalId,
      @Schema(description = "기업명", example = "카카오") String companyName,
      @Schema(description = "공고 제목", example = "백엔드 주니어 개발자 채용") String title,
      @Schema(description = "공고 키워드 목록") List<String> keywords,
      @Schema(description = "근무지역 코드", example = "I010") String areaCode,
      @Schema(description = "경력조건 코드", example = "S0010003") String careerCode,
      @Schema(description = "마감일", example = "2026-06-30") LocalDate deadline,
      @Schema(description = "등록일", example = "2026-05-01") LocalDate postedDate,
      @Schema(description = "잡코리아 상세 공고 URL") String jobkoreaUrl,
      @Schema(description = "AI 매칭 점수 (0~100)", example = "87") int aiMatchScore,
      @Schema(description = "AI 추천 이유", example = "Java·Spring Boot 역량이 공고 요건과 일치합니다.")
          String aiReason) {}
}