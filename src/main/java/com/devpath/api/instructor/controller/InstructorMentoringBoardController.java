package com.devpath.api.instructor.controller;

import com.devpath.api.instructor.dto.mentoring.InstructorMentoringBoardPayload;
import com.devpath.api.instructor.service.InstructorMentoringBoardService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "강사 - 멘토링 보드", description = "강사 멘토링 보드 API")
@RestController
@RequestMapping("/api/instructor/mentoring")
@RequiredArgsConstructor
public class InstructorMentoringBoardController {

  private final InstructorMentoringBoardService instructorMentoringBoardService;

  @Operation(summary = "멘토링 보드 조회")
  @GetMapping("/board")
  public ApiResponse<InstructorMentoringBoardPayload> getBoard(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.success(
        "Mentoring board loaded.", instructorMentoringBoardService.getBoard(userId));
  }

  @Operation(summary = "멘토링 보드 저장")
  @PutMapping("/board")
  public ApiResponse<InstructorMentoringBoardPayload> saveBoard(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @RequestBody InstructorMentoringBoardPayload payload) {
    return ApiResponse.success(
        "Mentoring board saved.", instructorMentoringBoardService.saveBoard(userId, payload));
  }
}
