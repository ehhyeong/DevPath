package com.devpath.api.evaluation.controller;

import com.devpath.api.evaluation.dto.request.GradeSubmissionRequest;
import com.devpath.api.evaluation.dto.response.AssignmentPrecheckResponse;
import com.devpath.api.evaluation.dto.response.SubmissionDetailResponse;
import com.devpath.api.evaluation.dto.response.SubmissionGradeResponse;
import com.devpath.api.evaluation.dto.response.SubmissionResponse;
import com.devpath.api.evaluation.service.SubmissionGradingService;
import com.devpath.api.evaluation.service.SubmissionQueryService;
import com.devpath.common.response.ApiResponse;
import com.devpath.domain.learning.entity.SubmissionStatus;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "강의 평가 - 제출물 채점", description = "강사용 제출물 조회 및 채점 API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/evaluation/instructor")
public class InstructorSubmissionController {

  // Evaluation Swagger 문서화 기준에 맞춘 강사용 제출물 컨트롤러다.
  private final SubmissionQueryService submissionQueryService;
  private final SubmissionGradingService submissionGradingService;

  @Operation(
      summary = "제출물 목록 조회",
      description =
          "특정 과제의 제출물 목록을 조회합니다. 상태 필터를 함께 전달하면 해당 상태의 제출물만 조회합니다. JWT 적용 전까지 Swagger 테스트용으로 userId를 요청 파라미터로 받습니다. 응답 데이터는 ApiResponse.data에 감싸져 반환됩니다.")
  @GetMapping("/assignments/{assignmentId}/submissions")
  public ResponseEntity<ApiResponse<List<SubmissionResponse>>> getSubmissionList(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @Parameter(description = "과제 ID", example = "10") @PathVariable Long assignmentId,
      @Parameter(description = "제출 상태 필터", example = "SUBMITTED") @RequestParam(required = false)
          SubmissionStatus status) {
    return ResponseEntity.ok(
        ApiResponse.ok(submissionQueryService.getSubmissionList(userId, assignmentId, status)));
  }

  @Operation(
      summary = "제출물 상세 조회",
      description =
          "제출 본문, 파일, 자동 검증 결과, 루브릭, 피드백 정보를 포함한 제출물 상세 정보를 조회합니다. JWT 적용 전까지 Swagger 테스트용으로 userId를 요청 파라미터로 받습니다. 응답 데이터는 ApiResponse.data에 감싸져 반환됩니다.")
  @GetMapping("/submissions/{submissionId}")
  public ResponseEntity<ApiResponse<SubmissionDetailResponse>> getSubmissionDetail(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @Parameter(description = "제출 ID", example = "1") @PathVariable Long submissionId) {
    return ResponseEntity.ok(
        ApiResponse.ok(submissionQueryService.getSubmissionDetail(userId, submissionId)));
  }

  @Operation(
      summary = "제출물 precheck 결과 조회",
      description =
          "README, 테스트, 린트, 파일 형식 검증으로 계산된 자동 precheck 결과를 조회합니다. JWT 적용 전까지 Swagger 테스트용으로 userId를 요청 파라미터로 받습니다. 응답 데이터는 ApiResponse.data에 감싸져 반환됩니다.")
  @GetMapping("/submissions/{submissionId}/precheck")
  public ResponseEntity<ApiResponse<AssignmentPrecheckResponse>> getPrecheckResult(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @Parameter(description = "제출 ID", example = "1") @PathVariable Long submissionId) {
    return ResponseEntity.ok(
        ApiResponse.ok(submissionQueryService.getPrecheckResult(userId, submissionId)));
  }

  @Operation(
      summary = "제출물 채점",
      description =
          "제출물을 루브릭 점수 기준으로 채점합니다. JWT 적용 전까지 Swagger 테스트용으로 userId를 요청 파라미터로 받습니다. 응답 데이터는 ApiResponse.data에 감싸져 반환됩니다.")
  @PostMapping("/submissions/{submissionId}/grade")
  public ResponseEntity<ApiResponse<SubmissionGradeResponse>> gradeSubmission(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @Parameter(description = "제출 ID", example = "1") @PathVariable Long submissionId,
      @Valid @RequestBody GradeSubmissionRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            "제출물 채점이 완료되었습니다.",
            submissionGradingService.gradeSubmission(userId, submissionId, request)));
  }
}
