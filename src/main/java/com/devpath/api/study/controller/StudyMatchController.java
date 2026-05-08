package com.devpath.api.study.controller;

import static com.devpath.common.security.AuthenticationUtils.requireUserId;

import com.devpath.api.study.dto.StudyMatchRecommendationResponse;
import com.devpath.api.study.dto.StudyMatchResponse;
import com.devpath.api.study.service.StudyMatchService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/study-matches")
@RequiredArgsConstructor
@Tag(name = "학습자 - 스터디 매칭", description = "학습자 스터디 매칭 및 추천 API")
public class StudyMatchController {

  private final StudyMatchService studyMatchService;

  @GetMapping
  @Operation(summary = "내 스터디 매칭 조회")
  public ApiResponse<List<StudyMatchResponse>> getMyMatches(
      @Parameter(hidden = true) @AuthenticationPrincipal Long learnerId) {
    return ApiResponse.ok(studyMatchService.getMyMatches(requireUserId(learnerId)));
  }

  @GetMapping("/recommendations")
  @Operation(summary = "스터디 매칭 추천 조회")
  public ApiResponse<List<StudyMatchRecommendationResponse>> getRecommendations(
      @Parameter(hidden = true) @AuthenticationPrincipal Long learnerId) {
    return ApiResponse.ok(studyMatchService.getRecommendations(requireUserId(learnerId)));
  }
}
