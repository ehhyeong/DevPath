package com.devpath.api.evaluation.controller;

import com.devpath.api.evaluation.dto.response.QuestionBankStatsResponse;
import com.devpath.api.evaluation.service.QuestionBankStatsService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "강의 평가 - 문제 은행", description = "강사용 문제 은행 통계 조회 API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/evaluation/instructor/question-bank")
public class QuestionBankController {

  // Evaluation Swagger 문서화 기준에 맞춘 문제 은행 컨트롤러다.
  private final QuestionBankStatsService questionBankStatsService;

  @Operation(
      summary = "문제 은행 통계 조회",
      description =
          "기존 Quiz와 QuizQuestion 테이블 기준으로 전체 문제 수, 문항 유형별 수, 최근 생성 문제 수, 채택된 AI 초안 수, 퀴즈별 문제 수를 조회합니다. JWT 적용 전까지 Swagger 테스트용으로 userId를 요청 파라미터로 받습니다. 응답 데이터는 ApiResponse.data에 감싸져 반환됩니다.")
  @GetMapping("/stats")
  public ResponseEntity<ApiResponse<QuestionBankStatsResponse>> getQuestionBankStats(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ResponseEntity.ok(ApiResponse.ok(questionBankStatsService.getQuestionBankStats(userId)));
  }
}
