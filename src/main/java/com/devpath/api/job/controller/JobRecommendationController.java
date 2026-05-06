package com.devpath.api.job.controller;

import com.devpath.api.job.dto.JobRecommendationRequest;
import com.devpath.api.job.dto.JobRecommendationResponse;
import com.devpath.api.job.service.JobRecommendationService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Job Recommendation", description = "학습자 참고용 채용 공고 추천 API")
@RestController
@RequiredArgsConstructor
public class JobRecommendationController {

  private final JobRecommendationService jobRecommendationService;

  @GetMapping("/api/jobs/recommendations/me")
  @Operation(
      summary = "내 추천 공고 조회",
      description = "지역, 경력 조건, 보유 스킬, Proof Card, 완료 로드맵 기반 추천 공고를 조회합니다.")
  public ResponseEntity<ApiResponse<List<JobRecommendationResponse.Recommendation>>>
      getMyRecommendations(
          @Parameter(description = "사용자 ID", example = "2") @RequestParam(required = false)
              Long userId,
          @Parameter(description = "희망 지역", example = "SEOUL") @RequestParam(required = false)
              String region,
          @Parameter(description = "희망 경력 조건", example = "JUNIOR")
              @RequestParam(required = false)
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

    return ResponseEntity.ok(ApiResponse.ok(jobRecommendationService.getMyRecommendations(condition)));
  }
}
