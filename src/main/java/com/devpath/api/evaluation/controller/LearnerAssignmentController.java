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

@Tag(name = "Learner - Assignment", description = "학습자 과제 precheck 및 제출 API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/evaluation/learner/assignments")
public class LearnerAssignmentController {

    private final AssignmentPrecheckService assignmentPrecheckService;
    private final AssignmentSubmissionService assignmentSubmissionService;

    @Operation(summary = "과제 precheck", description = "README, 테스트, 린트, 파일 형식 기준으로 제출 전 자동 검증을 수행합니다.")
    @PostMapping("/{assignmentId}/precheck")
    public ResponseEntity<ApiResponse<AssignmentPrecheckResponse>> precheck(
            @Parameter(description = "학습자 ID", example = "1")
            @RequestParam Long userId,
            @Parameter(description = "과제 ID", example = "10")
            @PathVariable Long assignmentId,
            @Valid @RequestBody AssignmentPrecheckRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                assignmentPrecheckService.precheck(userId, assignmentId, request)
        ));
    }

    @Operation(summary = "과제 제출", description = "학습자가 precheck를 통과한 조건으로 과제를 실제 제출합니다.")
    @PostMapping("/{assignmentId}/submissions")
    public ResponseEntity<ApiResponse<SubmissionResponse>> createSubmission(
            @Parameter(description = "학습자 ID", example = "1")
            @RequestParam Long userId,
            @Parameter(description = "과제 ID", example = "10")
            @PathVariable Long assignmentId,
            @Valid @RequestBody CreateSubmissionRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                "과제가 제출되었습니다.",
                assignmentSubmissionService.createSubmission(userId, assignmentId, request)
        ));
    }

    @Operation(summary = "제출 이력 조회", description = "학습자가 자신의 과제 제출 이력을 최신순으로 조회합니다.")
    @GetMapping("/submissions/history")
    public ResponseEntity<ApiResponse<SubmissionHistoryResponse>> getSubmissionHistory(
            @Parameter(description = "학습자 ID", example = "1")
            @RequestParam Long userId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                assignmentSubmissionService.getSubmissionHistory(userId)
        ));
    }
}
