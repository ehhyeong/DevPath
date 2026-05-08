package com.devpath.api.evaluation.controller;

import com.devpath.api.evaluation.dto.request.AssignmentPrecheckRequest;
import com.devpath.api.evaluation.dto.request.CreateSubmissionRequest;
import com.devpath.api.evaluation.dto.response.AssignmentPrecheckResponse;
import com.devpath.api.evaluation.dto.response.SubmissionHistoryResponse;
import com.devpath.api.evaluation.dto.response.SubmissionResponse;
import com.devpath.api.evaluation.service.AssignmentPrecheckService;
import com.devpath.api.evaluation.service.AssignmentSubmissionService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "강의 평가 - 과제 제출", description = "학습자용 과제 precheck, 제출, 제출 이력 조회 API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/evaluation/learner/assignments")
public class LearnerAssignmentController {

  // Evaluation Swagger 문서화 기준에 맞춘 학습자 과제 컨트롤러다.
  private final AssignmentPrecheckService assignmentPrecheckService;
  private final AssignmentSubmissionService assignmentSubmissionService;

  @Operation(
      summary = "과제 precheck",
      description =
          "학습자가 제출 전 README, 테스트, 린트, 파일 형식 조건 충족 여부를 미리 검증합니다. JWT 적용 전까지 Swagger 테스트용으로 userId를 요청 파라미터로 받습니다. 응답 데이터는 ApiResponse.data에 감싸져 반환됩니다.")
  @PostMapping("/{assignmentId}/precheck")
  public ResponseEntity<ApiResponse<AssignmentPrecheckResponse>> precheck(
      @Parameter(description = "학습자 ID", example = "1") @RequestParam Long userId,
      @Parameter(description = "과제 ID", example = "10") @PathVariable Long assignmentId,
      @Valid @RequestBody AssignmentPrecheckRequest request) {
    return ResponseEntity.ok(
        ApiResponse.ok(assignmentPrecheckService.precheck(userId, assignmentId, request)));
  }

  @Operation(
      summary = "과제 제출",
      description =
          "학습자가 precheck 기준을 바탕으로 과제를 실제 제출합니다. JWT 적용 전까지 Swagger 테스트용으로 userId를 요청 파라미터로 받습니다. 응답 데이터는 ApiResponse.data에 감싸져 반환됩니다.")
  @PostMapping("/{assignmentId}/submissions")
  public ResponseEntity<ApiResponse<SubmissionResponse>> createSubmission(
      @Parameter(description = "학습자 ID", example = "1") @RequestParam Long userId,
      @Parameter(description = "과제 ID", example = "10") @PathVariable Long assignmentId,
      @Valid @RequestBody CreateSubmissionRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            "과제가 제출되었습니다.",
            assignmentSubmissionService.createSubmission(userId, assignmentId, request)));
  }

  @Operation(
      summary = "제출 이력 조회",
      description =
          "학습자가 자신의 과제 제출 이력을 최신순으로 조회합니다. JWT 적용 전까지 Swagger 테스트용으로 userId를 요청 파라미터로 받습니다. 응답 데이터는 ApiResponse.data에 감싸져 반환됩니다.")
  @GetMapping("/submissions/history")
  public ResponseEntity<ApiResponse<SubmissionHistoryResponse>> getSubmissionHistory(
      @Parameter(description = "학습자 ID", example = "1") @RequestParam Long userId) {
    return ResponseEntity.ok(
        ApiResponse.ok(assignmentSubmissionService.getSubmissionHistory(userId)));
  }
}
