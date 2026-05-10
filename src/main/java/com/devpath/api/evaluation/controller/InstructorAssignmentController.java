package com.devpath.api.evaluation.controller;

import com.devpath.api.evaluation.dto.request.CreateAssignmentRequest;
import com.devpath.api.evaluation.dto.response.AssignmentDetailResponse;
import com.devpath.api.evaluation.service.AssignmentCommandService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "강의 평가 - 과제 관리", description = "강사용 과제 생성 및 제출 규칙 관리 API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/instructor/assignments")
public class InstructorAssignmentController {

  // Evaluation Swagger 문서화 기준에 맞춘 강사용 과제 컨트롤러다.
  private final AssignmentCommandService assignmentCommandService;

  @Operation(
      summary = "과제 생성",
      description =
          "강사가 과제 기본 정보와 제출 규칙을 함께 생성합니다. JWT 적용 전까지 Swagger 테스트용으로 userId를 요청 파라미터로 받습니다. 응답 데이터는 ApiResponse.data에 감싸져 반환됩니다.")
  @PostMapping
  public ResponseEntity<ApiResponse<AssignmentDetailResponse>> createAssignment(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @Valid @RequestBody CreateAssignmentRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            "과제가 생성되었습니다.", assignmentCommandService.createAssignment(userId, request)));
  }

  @Operation(
      summary = "과제 제출 규칙 수정",
      description =
          "강사가 특정 과제의 마감일, 허용 파일 형식, README/테스트/린트 요구사항 등 제출 규칙을 수정합니다. JWT 적용 전까지 Swagger 테스트용으로 userId를 요청 파라미터로 받습니다. 응답 데이터는 ApiResponse.data에 감싸져 반환됩니다.")
  @PatchMapping("/{assignmentId}/submission-rule")
  public ResponseEntity<ApiResponse<AssignmentDetailResponse>> updateSubmissionRule(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @Parameter(description = "과제 ID", example = "20") @PathVariable Long assignmentId,
      @Valid @RequestBody CreateAssignmentRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            "과제 제출 규칙이 수정되었습니다.",
            assignmentCommandService.updateSubmissionRule(userId, assignmentId, request)));
  }
}
