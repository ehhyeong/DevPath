package com.devpath.api.market.controller;

import com.devpath.api.market.dto.LearningFeedbackRequest;
import com.devpath.api.market.dto.LearningFeedbackResponse;
import com.devpath.api.market.service.LearningFeedbackService;
import com.devpath.common.response.ApiResponse;
import com.devpath.common.swagger.SwaggerTag;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = SwaggerTag.LEARNING_FEEDBACK, description = "시장 분석 기반 학습 환류 API")
@RestController
@RequiredArgsConstructor
public class LearningFeedbackController {

  private final LearningFeedbackService learningFeedbackService;

  @PostMapping("/api/market/learning-feedback/refresh")
  @Operation(
      summary = "학습 데이터 재추출",
      description = "CareerProfile 스킬과 시장 기술 태그를 다시 비교해 스킬 갭을 계산합니다.")
  public ResponseEntity<ApiResponse<LearningFeedbackResponse.RefreshResult>> refreshLearningData(
      @Valid @RequestBody LearningFeedbackRequest.Refresh request) {
    return ResponseEntity.ok(ApiResponse.ok(learningFeedbackService.refreshLearningData(request)));
  }

  @GetMapping("/api/market/learning-feedback/next-steps")
  @Operation(summary = "다음 학습 스텝 제안", description = "시장 분석 기반으로 다음 학습 스텝을 추천합니다.")
  public ResponseEntity<ApiResponse<LearningFeedbackResponse.NextSteps>> getNextSteps(
      @Parameter(description = "채용 분석용 프로필 ID", example = "1") @RequestParam Long profileId) {
    return ResponseEntity.ok(ApiResponse.ok(learningFeedbackService.getNextSteps(profileId)));
  }

  @PostMapping("/api/market/learning-feedback/related-roadmaps")
  @Operation(summary = "관련 로드맵 추천", description = "스킬 갭 기반 관련 로드맵 추천 결과를 반환합니다.")
  public ResponseEntity<ApiResponse<LearningFeedbackResponse.RelatedRoadmaps>> getRelatedRoadmaps(
      @Valid @RequestBody LearningFeedbackRequest.RelatedRoadmaps request) {
    return ResponseEntity.ok(ApiResponse.ok(learningFeedbackService.getRelatedRoadmaps(request)));
  }

  @PostMapping("/api/market/learning-feedback/add-to-roadmap")
  @Operation(summary = "로드맵에 추가하기", description = "부족 스킬을 특정 로드맵에 추가할 후보로 생성합니다.")
  public ResponseEntity<ApiResponse<LearningFeedbackResponse.AddToRoadmapResult>> addToRoadmap(
      @Valid @RequestBody LearningFeedbackRequest.AddToRoadmap request) {
    return ResponseEntity.ok(ApiResponse.ok(learningFeedbackService.addToRoadmap(request)));
  }

  @PostMapping("/api/market/learning-feedback/courses")
  @Operation(summary = "스킬 갭 기반 추천 강의 조회", description = "부족 스킬 기반 추천 강의 결과를 반환합니다.")
  public ResponseEntity<ApiResponse<LearningFeedbackResponse.RecommendedCourses>>
      getRecommendedCourses(@Valid @RequestBody LearningFeedbackRequest.Courses request) {
    return ResponseEntity.ok(
        ApiResponse.ok(learningFeedbackService.getRecommendedCourses(request)));
  }
}
