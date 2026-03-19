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
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Instructor Evaluation - Rubric", description = "강사용 루브릭 관리 API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/instructor")
public class InstructorRubricController {

  // 루브릭 생성 및 수정 비즈니스 로직을 담당하는 서비스다.
  private final RubricCommandService rubricCommandService;

  // 강사가 특정 과제에 루브릭을 추가한다.
  @Operation(summary = "강사 루브릭 생성", description = "강사가 특정 과제에 채점 루브릭 항목을 생성합니다.")
  @PostMapping("/assignments/{assignmentId}/rubrics")
  public ResponseEntity<ApiResponse<RubricResponse>> createRubric(
      @Parameter(description = "강사 유저 ID", example = "1") @RequestParam Long userId,
      @Parameter(description = "과제 ID", example = "20") @PathVariable Long assignmentId,
      @Valid @RequestBody CreateRubricRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            "루브릭이 생성되었습니다.",
            rubricCommandService.createRubric(userId, assignmentId, request)));
  }

  // 강사가 기존 루브릭 항목을 수정한다.
  @Operation(summary = "강사 루브릭 수정", description = "강사가 특정 루브릭 항목의 이름, 설명, 배점, 순서를 수정합니다.")
  @PatchMapping("/rubrics/{rubricId}")
  public ResponseEntity<ApiResponse<RubricResponse>> updateRubric(
      @Parameter(description = "강사 유저 ID", example = "1") @RequestParam Long userId,
      @Parameter(description = "루브릭 ID", example = "301") @PathVariable Long rubricId,
      @Valid @RequestBody UpdateRubricRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success("루브릭이 수정되었습니다.", rubricCommandService.updateRubric(userId, rubricId, request)));
  }
}
