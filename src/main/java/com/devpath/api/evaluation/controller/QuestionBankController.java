package com.devpath.api.evaluation.controller;

import com.devpath.api.evaluation.dto.response.QuestionBankStatsResponse;
import com.devpath.api.evaluation.service.QuestionBankStatsService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Instructor - Question Bank", description = "강사용 문제 은행 통계 API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/evaluation/instructor/question-bank")
public class QuestionBankController {

  private final QuestionBankStatsService questionBankStatsService;

  @Operation(
      summary = "문제 은행 통계 조회",
      description = "전체 문제 수, 문항 유형별 수, 최근 생성 문제 수, 채택된 AI 초안 수, 퀴즈별 문제 수를 조회합니다.")
  @GetMapping("/stats")
  public ResponseEntity<ApiResponse<QuestionBankStatsResponse>> getQuestionBankStats(
      @Parameter(description = "강사 ID", example = "3") @RequestParam Long userId) {
    return ResponseEntity.ok(ApiResponse.ok(questionBankStatsService.getQuestionBankStats(userId)));
  }
}
