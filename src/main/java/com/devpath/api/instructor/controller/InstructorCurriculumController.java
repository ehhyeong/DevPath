package com.devpath.api.instructor.controller;

import com.devpath.api.instructor.dto.InstructorLessonDto;
import com.devpath.api.instructor.dto.InstructorSectionDto;
import com.devpath.api.instructor.service.InstructorCourseService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "강의 커리큘럼 구성 API", description = "섹션, 레슨, 선행 조건, 레슨 순서 관리 API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/instructor")
public class InstructorCurriculumController {

  private final InstructorCourseService instructorCourseService;

  @Operation(summary = "섹션 생성")
  @PostMapping("/courses/{courseId}/sections")
  public ApiResponse<Long> createSection(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @PathVariable Long courseId,
      @Valid @RequestBody InstructorSectionDto.CreateSectionRequest request) {
    Long sectionId = instructorCourseService.createSection(userId, courseId, request);
    return ApiResponse.success("섹션이 생성되었습니다.", sectionId);
  }

  @Operation(summary = "섹션 수정")
  @PutMapping("/sections/{sectionId}")
  public ApiResponse<Void> updateSection(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @PathVariable Long sectionId,
      @Valid @RequestBody InstructorSectionDto.UpdateSectionRequest request) {
    instructorCourseService.updateSection(userId, sectionId, request);
    return ApiResponse.success("섹션이 수정되었습니다.", null);
  }

  @Operation(summary = "섹션 삭제")
  @DeleteMapping("/sections/{sectionId}")
  public ApiResponse<Void> deleteSection(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @PathVariable Long sectionId) {
    instructorCourseService.deleteSection(userId, sectionId);
    return ApiResponse.success("섹션이 삭제되었습니다.", null);
  }

  @Operation(summary = "레슨 생성")
  @PostMapping("/sections/{sectionId}/lessons")
  public ApiResponse<Long> createLesson(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @PathVariable Long sectionId,
      @Valid @RequestBody InstructorLessonDto.CreateLessonRequest request) {
    Long lessonId = instructorCourseService.createLesson(userId, sectionId, request);
    return ApiResponse.success("레슨이 생성되었습니다.", lessonId);
  }

  @Operation(summary = "레슨 수정")
  @PutMapping("/lessons/{lessonId}")
  public ApiResponse<Void> updateLesson(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @PathVariable Long lessonId,
      @Valid @RequestBody InstructorLessonDto.UpdateLessonRequest request) {
    instructorCourseService.updateLesson(userId, lessonId, request);
    return ApiResponse.success("레슨이 수정되었습니다.", null);
  }

  @Operation(summary = "레슨 선행 조건 전체 교체")
  @PutMapping("/lessons/{lessonId}/prerequisites")
  public ApiResponse<InstructorLessonDto.UpdateLessonPrerequisitesResponse>
      updateLessonPrerequisites(
          @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
          @PathVariable Long lessonId,
          @Valid @RequestBody InstructorLessonDto.UpdateLessonPrerequisitesRequest request) {
    InstructorLessonDto.UpdateLessonPrerequisitesResponse response =
        instructorCourseService.updateLessonPrerequisites(userId, lessonId, request);
    return ApiResponse.success("레슨 선행 조건이 저장되었습니다.", response);
  }

  @Operation(summary = "레슨 삭제")
  @DeleteMapping("/lessons/{lessonId}")
  public ApiResponse<Void> deleteLesson(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @PathVariable Long lessonId) {
    instructorCourseService.deleteLesson(userId, lessonId);
    return ApiResponse.success("레슨이 삭제되었습니다.", null);
  }

  @Operation(summary = "레슨 순서 변경")
  @PatchMapping("/lessons/order")
  public ApiResponse<Void> updateLessonOrder(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @Valid @RequestBody InstructorLessonDto.UpdateLessonOrderRequest request) {
    instructorCourseService.updateLessonOrder(userId, request);
    return ApiResponse.success("레슨 순서가 변경되었습니다.", null);
  }
}
