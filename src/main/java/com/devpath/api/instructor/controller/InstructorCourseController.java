package com.devpath.api.instructor.controller;

import com.devpath.api.instructor.dto.InstructorCourseDto;
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

// 강사용 강의 관리 API를 제공한다.
@Tag(name = "강사용 강의 API", description = "강사가 자신의 강의를 생성, 수정, 삭제, 상태 변경할 수 있는 API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/instructor/courses")
public class InstructorCourseController {

  private final InstructorCourseService instructorCourseService;

  // 강사가 새 강의를 생성한다.
  @Operation(summary = "강의 생성")
  @PostMapping
  public ApiResponse<Long> createCourse(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @Valid @RequestBody InstructorCourseDto.CreateCourseRequest request) {
    Long courseId = instructorCourseService.createCourse(userId, request);
    return ApiResponse.success("강의가 생성되었습니다.", courseId);
  }

  // 강사가 자신의 강의 기본 정보를 수정한다.
  @Operation(summary = "강의 수정")
  @PutMapping("/{courseId}")
  public ApiResponse<Void> updateCourse(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @PathVariable Long courseId,
      @Valid @RequestBody InstructorCourseDto.UpdateCourseRequest request) {
    instructorCourseService.updateCourse(userId, courseId, request);
    return ApiResponse.success("강의가 수정되었습니다.", null);
  }

  // 강사가 자신의 강의를 삭제한다.
  @Operation(summary = "강의 삭제")
  @DeleteMapping("/{courseId}")
  public ApiResponse<Void> deleteCourse(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId, @PathVariable Long courseId) {
    instructorCourseService.deleteCourse(userId, courseId);
    return ApiResponse.success("강의가 삭제되었습니다.", null);
  }

  // 강사가 자신의 강의 상태를 변경한다.
  @Operation(summary = "강의 상태 변경")
  @PatchMapping("/{courseId}/status")
  public ApiResponse<Void> updateCourseStatus(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @PathVariable Long courseId,
      @Valid @RequestBody InstructorCourseDto.UpdateStatusRequest request) {
    instructorCourseService.updateCourseStatus(userId, courseId, request);
    return ApiResponse.success("강의 상태가 변경되었습니다.", null);
  }

  // 강사가 특정 강의에 섹션을 추가한다.
  @Operation(summary = "섹션 생성")
  @PostMapping("/{courseId}/sections")
  public ApiResponse<Long> createSection(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @PathVariable Long courseId,
      @Valid @RequestBody InstructorSectionDto.CreateSectionRequest request) {
    Long sectionId = instructorCourseService.createSection(userId, courseId, request);
    return ApiResponse.success("섹션이 생성되었습니다.", sectionId);
  }

  // 강사가 자신의 섹션을 수정한다.
  @Operation(summary = "섹션 수정")
  @PutMapping("/sections/{sectionId}")
  public ApiResponse<Void> updateSection(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @PathVariable Long sectionId,
      @Valid @RequestBody InstructorSectionDto.UpdateSectionRequest request) {
    instructorCourseService.updateSection(userId, sectionId, request);
    return ApiResponse.success("섹션이 수정되었습니다.", null);
  }

  // 강사가 자신의 섹션을 삭제한다.
  @Operation(summary = "섹션 삭제")
  @DeleteMapping("/sections/{sectionId}")
  public ApiResponse<Void> deleteSection(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @PathVariable Long sectionId) {
    instructorCourseService.deleteSection(userId, sectionId);
    return ApiResponse.success("섹션이 삭제되었습니다.", null);
  }

  // 강사가 특정 섹션에 레슨을 추가한다.
  @Operation(summary = "레슨 생성")
  @PostMapping("/sections/{sectionId}/lessons")
  public ApiResponse<Long> createLesson(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @PathVariable Long sectionId,
      @Valid @RequestBody InstructorLessonDto.CreateLessonRequest request) {
    Long lessonId = instructorCourseService.createLesson(userId, sectionId, request);
    return ApiResponse.success("레슨이 생성되었습니다.", lessonId);
  }

  // 강사가 자신의 레슨을 수정한다.
  @Operation(summary = "레슨 수정")
  @PutMapping("/lessons/{lessonId}")
  public ApiResponse<Void> updateLesson(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @PathVariable Long lessonId,
      @Valid @RequestBody InstructorLessonDto.UpdateLessonRequest request) {
    instructorCourseService.updateLesson(userId, lessonId, request);
    return ApiResponse.success("레슨이 수정되었습니다.", null);
  }

  // 강사가 자신의 레슨을 삭제한다.
  @Operation(summary = "레슨 삭제")
  @DeleteMapping("/lessons/{lessonId}")
  public ApiResponse<Void> deleteLesson(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId, @PathVariable Long lessonId) {
    instructorCourseService.deleteLesson(userId, lessonId);
    return ApiResponse.success("레슨이 삭제되었습니다.", null);
  }

  // 강사가 동일 섹션 내 레슨 순서를 일괄 변경한다.
  @Operation(summary = "레슨 순서 변경")
  @PatchMapping("/lessons/order")
  public ApiResponse<Void> updateLessonOrder(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @Valid @RequestBody InstructorLessonDto.UpdateLessonOrderRequest request) {
    instructorCourseService.updateLessonOrder(userId, request);
    return ApiResponse.success("레슨 순서가 변경되었습니다.", null);
  }
}
