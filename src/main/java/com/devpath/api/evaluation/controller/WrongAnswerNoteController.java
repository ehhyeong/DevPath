package com.devpath.api.evaluation.controller;

import com.devpath.api.evaluation.dto.request.SaveWrongAnswerNoteRequest;
import com.devpath.api.evaluation.dto.response.WrongAnswerNoteResponse;
import com.devpath.api.evaluation.service.WrongAnswerNoteService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "강의 평가 - 오답 노트", description = "학습자용 오답 노트 저장 API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/evaluation/learner/wrong-answer-notes")
public class WrongAnswerNoteController {

  // Evaluation Swagger 문서화 기준에 맞춘 오답 노트 컨트롤러다.
  private final WrongAnswerNoteService wrongAnswerNoteService;

  @Operation(
      summary = "오답 노트 저장",
      description =
          "학습자가 특정 퀴즈 응시의 오답 문항에 대해 복습 메모를 저장합니다. JWT 적용 전까지 Swagger 테스트용으로 userId를 요청 파라미터로 받습니다. 응답 데이터는 ApiResponse.data에 감싸져 반환됩니다.")
  @PostMapping("/attempts/{attemptId}")
  public ResponseEntity<ApiResponse<WrongAnswerNoteResponse>> saveWrongAnswerNote(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @Parameter(description = "응시 ID", example = "100") @PathVariable Long attemptId,
      @Valid @RequestBody SaveWrongAnswerNoteRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            "오답 노트가 저장되었습니다.",
            wrongAnswerNoteService.saveWrongAnswerNote(userId, attemptId, request)));
  }
}
