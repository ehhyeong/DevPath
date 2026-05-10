package com.devpath.api.learner.controller;

import com.devpath.api.learner.dto.DiagnosisQuizDto;
import com.devpath.api.learner.service.DiagnosisQuizService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/me/roadmaps")
@RequiredArgsConstructor
@Profile({"local", "test"})
@Tag(name = "진단 퀴즈 테스트", description = "local/test 프로필 전용 진단 퀴즈 테스트 API")
public class DiagnosisQuizTestController {

  private final DiagnosisQuizService diagnosisQuizService;

  @PostMapping("/{roadmapId}/diagnosis/test-run")
  @Operation(summary = "[TEST] 즉시 분기 추천 생성", description = "local/test 프로필 전용 테스트 API입니다")
  public ResponseEntity<ApiResponse<DiagnosisQuizDto.TestRunResponse>> testRunDiagnosis(
      @PathVariable Long roadmapId,
      @RequestParam Long originalNodeId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {

    DiagnosisQuizDto.TestRunResponse response =
        diagnosisQuizService.testRunRecommend(userId, roadmapId, originalNodeId);
    return ResponseEntity.ok(ApiResponse.ok(response));
  }
}
