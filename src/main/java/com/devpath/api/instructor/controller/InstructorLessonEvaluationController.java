package com.devpath.api.instructor.controller;

import com.devpath.api.instructor.dto.InstructorLessonEvaluationDto;
import com.devpath.api.instructor.service.InstructorLessonEvaluationService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/instructor/lessons")
@Tag(name = "강사 - 레슨 평가", description = "강사용 레슨 퀴즈/과제 편집 API")
public class InstructorLessonEvaluationController {

  private final InstructorLessonEvaluationService instructorLessonEvaluationService;

  @GetMapping("/{lessonId}/quiz-editor")
  @Operation(summary = "퀴즈 편집기 조회", description = "레슨별 퀴즈 편집 데이터를 조회합니다.")
  public ApiResponse<InstructorLessonEvaluationDto.QuizEditorResponse> getQuizEditor(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId, @PathVariable Long lessonId) {
    return ApiResponse.ok(instructorLessonEvaluationService.getQuizEditor(userId, lessonId));
  }

  @PutMapping("/{lessonId}/quiz-editor")
  @Operation(summary = "퀴즈 편집 내용 저장", description = "레슨별 퀴즈 편집 내용을 저장합니다.")
  public ApiResponse<InstructorLessonEvaluationDto.QuizEditorResponse> saveQuizEditor(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @PathVariable Long lessonId,
      @Valid @RequestBody InstructorLessonEvaluationDto.SaveQuizEditorRequest request) {
    return ApiResponse.success(
        "퀴즈 편집 내용이 저장되었습니다.",
        instructorLessonEvaluationService.saveQuizEditor(userId, lessonId, request));
  }

  @PostMapping("/{lessonId}/quiz-editor/generate")
  @Operation(summary = "퀴즈 초안 생성", description = "레슨 내용을 기반으로 퀴즈 초안을 생성합니다.")
  public ApiResponse<InstructorLessonEvaluationDto.QuizEditorResponse> generateQuizDraft(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @PathVariable Long lessonId,
      @Valid @RequestBody InstructorLessonEvaluationDto.GenerateQuizRequest request) {
    return ApiResponse.success(
        "퀴즈 초안이 생성되었습니다.",
        instructorLessonEvaluationService.generateQuizDraft(userId, lessonId, request));
  }

  @GetMapping("/{lessonId}/assignment-editor")
  @Operation(summary = "과제 편집기 조회", description = "레슨별 과제 편집 데이터를 조회합니다.")
  public ApiResponse<InstructorLessonEvaluationDto.AssignmentEditorResponse> getAssignmentEditor(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId, @PathVariable Long lessonId) {
    return ApiResponse.ok(instructorLessonEvaluationService.getAssignmentEditor(userId, lessonId));
  }

  @PutMapping("/{lessonId}/assignment-editor")
  @Operation(summary = "과제 편집 내용 저장", description = "레슨별 과제 편집 내용을 저장합니다.")
  public ApiResponse<InstructorLessonEvaluationDto.AssignmentEditorResponse> saveAssignmentEditor(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @PathVariable Long lessonId,
      @Valid @RequestBody InstructorLessonEvaluationDto.SaveAssignmentEditorRequest request) {
    return ApiResponse.success(
        "과제 편집 내용이 저장되었습니다.",
        instructorLessonEvaluationService.saveAssignmentEditor(userId, lessonId, request));
  }
}
