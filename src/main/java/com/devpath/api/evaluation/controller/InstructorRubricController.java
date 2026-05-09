package com.devpath.api.evaluation.controller;

import com.devpath.api.evaluation.dto.request.CreateRubricRequest;
import com.devpath.api.evaluation.dto.request.UpdateRubricRequest;
import com.devpath.api.evaluation.dto.response.RubricResponse;
import com.devpath.api.evaluation.service.RubricCommandService;
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

@Tag(name = "강의 평가 - 루브릭", description = "강사용 과제 채점 루브릭 생성 및 수정 API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/instructor")
public class InstructorRubricController {

  // Evaluation Swagger 문서화 기준에 맞춘 강사용 루브릭 컨트롤러다.
  private final RubricCommandService rubricCommandService;

  @Operation(
      summary = "루브릭 생성",
      description =
          "강사가 특정 과제에 연결할 채점 루브릭 항목을 생성합니다. JWT 적용 전까지 Swagger 테스트용으로 userId를 요청 파라미터로 받습니다. 응답 데이터는 ApiResponse.data에 감싸져 반환됩니다.")
  @PostMapping("/assignments/{assignmentId}/rubrics")
  public ResponseEntity<ApiResponse<RubricResponse>> createRubric(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @Parameter(description = "과제 ID", example = "20") @PathVariable Long assignmentId,
      @Valid @RequestBody CreateRubricRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            "루브릭이 생성되었습니다.", rubricCommandService.createRubric(userId, assignmentId, request)));
  }

  @Operation(
      summary = "루브릭 수정",
      description =
          "강사가 특정 루브릭의 기준명, 설명, 배점, 표시 순서를 수정합니다. JWT 적용 전까지 Swagger 테스트용으로 userId를 요청 파라미터로 받습니다. 응답 데이터는 ApiResponse.data에 감싸져 반환됩니다.")
  @PatchMapping("/rubrics/{rubricId}")
  public ResponseEntity<ApiResponse<RubricResponse>> updateRubric(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @Parameter(description = "루브릭 ID", example = "301") @PathVariable Long rubricId,
      @Valid @RequestBody UpdateRubricRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            "루브릭이 수정되었습니다.", rubricCommandService.updateRubric(userId, rubricId, request)));
  }
}
