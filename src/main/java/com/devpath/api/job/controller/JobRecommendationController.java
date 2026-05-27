package com.devpath.api.job.controller;

import com.devpath.api.job.dto.GeminiJobAnalysisResponse;
import com.devpath.api.job.dto.JobActivityProfileResponse;
import com.devpath.api.job.dto.JobRecommendationRequest;
import com.devpath.api.job.dto.JobRecommendationResponse;
import com.devpath.api.job.service.GeminiJobAnalysisService;
import com.devpath.api.job.service.JobActivityProfileService;
import com.devpath.api.job.service.JobRecommendationService;
import com.devpath.common.response.ApiResponse;
import com.devpath.common.swagger.SwaggerTag;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@Tag(name = SwaggerTag.JOB_RECOMMENDATION, description = "학습자 참고용 채용 공고 추천 API")
@RestController
@RequiredArgsConstructor
public class JobRecommendationController {

  private final JobRecommendationService jobRecommendationService;
  private final JobActivityProfileService jobActivityProfileService;
  private final GeminiJobAnalysisService geminiJobAnalysisService;

  @GetMapping("/api/jobs/recommendations/me")
  @Operation(
      summary = "내 추천 공고 조회",
      description = "지역, 경력 조건, 보유 스킬, Proof Card, 완료 로드맵 기반 추천 공고를 조회합니다.")
  public ResponseEntity<ApiResponse<List<JobRecommendationResponse.Recommendation>>>
      getMyRecommendations(
          @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
          @Parameter(description = "희망 지역", example = "SEOUL") @RequestParam(required = false)
              String region,
          @Parameter(description = "희망 경력 조건", example = "JUNIOR") @RequestParam(required = false)
              String careerLevel,
          @Parameter(description = "보유 스킬 목록. 쉼표로 구분", example = "Java,Spring Boot,JPA")
              @RequestParam(required = false)
              String skillTags,
          @Parameter(description = "Proof Card 검증 스킬 목록. 쉼표로 구분", example = "Docker,AWS")
              @RequestParam(required = false)
              String proofCardSkills,
          @Parameter(description = "완료 로드맵 스킬 목록. 쉼표로 구분", example = "React,TypeScript")
              @RequestParam(required = false)
              String completedRoadmapSkills) {
    JobRecommendationRequest.SearchCondition condition =
        new JobRecommendationRequest.SearchCondition(
            userId, region, careerLevel, skillTags, proofCardSkills, completedRoadmapSkills);

    return ResponseEntity.ok(
        ApiResponse.ok(jobRecommendationService.getMyRecommendations(condition)));
  }

  @GetMapping("/api/jobs/gemini-recommendations/me")
  @Operation(
      summary = "Gemini AI 채용공고 추천",
      description =
          "사용자 학습 프로필과 잡코리아 채용공고를 Gemini AI로 분석해 맞춤 추천 목록을 반환합니다."
              + " Gemini 호출 실패 시 503을 반환하며, 클라이언트는 기존 rule-based 로직으로 fallback합니다.")
  public ResponseEntity<ApiResponse<GeminiJobAnalysisResponse.Analysis>> getGeminiRecommendations(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @Parameter(description = "검색 키워드", example = "Java Spring Boot 백엔드") @RequestParam
          String keyword,
      @Parameter(description = "근무지역 코드", example = "I000") @RequestParam(required = false)
          String areaCode,
      @Parameter(description = "업·직종 소분류 코드", example = "1000229") @RequestParam(required = false)
          String jobCode) {
    try {
      return ResponseEntity.ok(
          ApiResponse.ok(geminiJobAnalysisService.analyze(userId, keyword, areaCode, jobCode)));
    } catch (Exception e) {
      log.warn("[GeminiRecommendations] 분석 실패 (fallback 트리거): {}", e.getMessage());
      return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
          .body(
              ApiResponse.ok(
                  new GeminiJobAnalysisResponse.Analysis(List.of(), false, e.getMessage())));
    }
  }

  @GetMapping("/api/jobs/activity-profile/me")
  @Operation(
      summary = "내부 프로젝트 활동 기반 스킬 프로필 조회",
      description = "워크스페이스 완료 티켓, 스쿼드 역할, Proof Card에서 채용 매칭용 스킬 신호를 추출합니다.")
  public ResponseEntity<ApiResponse<JobActivityProfileResponse.Summary>> getMyActivityProfile(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ResponseEntity.ok(
        ApiResponse.ok(jobActivityProfileService.getMyActivityProfile(userId)));
  }
}
