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
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Instructor Evaluation - Assignment", description = "강사용 과제 출제 API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/instructor/assignments")
public class InstructorAssignmentController {

  // 과제 생성 및 제출 규칙 저장 비즈니스 로직을 담당하는 서비스다.
  private final AssignmentCommandService assignmentCommandService;

  // 강사가 과제 기본 정보를 생성한다.
  @Operation(summary = "강사 과제 생성", description = "강사가 과제 기본 정보와 제출 규칙을 함께 생성합니다.")
  @PostMapping
  public ResponseEntity<ApiResponse<AssignmentDetailResponse>> createAssignment(
      @Parameter(description = "강사 유저 ID", example = "1") @RequestParam Long userId,
      @Valid @RequestBody CreateAssignmentRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success("과제가 생성되었습니다.", assignmentCommandService.createAssignment(userId, request)));
  }

  // 강사가 기존 과제의 제출 규칙을 저장하거나 수정한다.
  @Operation(summary = "강사 과제 제출 규칙 저장", description = "강사가 마감일, 허용 형식, README/테스트/린트 요구사항 등 제출 규칙을 저장합니다.")
  @PatchMapping("/{assignmentId}/submission-rule")
  public ResponseEntity<ApiResponse<AssignmentDetailResponse>> updateSubmissionRule(
      @Parameter(description = "강사 유저 ID", example = "1") @RequestParam Long userId,
      @Parameter(description = "과제 ID", example = "20") @PathVariable Long assignmentId,
      @Valid @RequestBody CreateAssignmentRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            "과제 제출 규칙이 저장되었습니다.",
            assignmentCommandService.updateSubmissionRule(userId, assignmentId, request)));
  }
}
