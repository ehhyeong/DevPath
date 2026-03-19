package com.devpath.api.instructor.controller;

import com.devpath.api.common.dto.CourseDetailResponse;
import com.devpath.api.instructor.dto.InstructorCourseDto;
import com.devpath.api.instructor.service.InstructorCourseQueryService;
import com.devpath.api.instructor.service.InstructorCourseService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "강의 기본 관리 API", description = "강의 생성, 조회, 수정, 삭제, 상태 변경 API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/instructor")
public class InstructorCourseManagementController {

  private final InstructorCourseService instructorCourseService;
  private final InstructorCourseQueryService instructorCourseQueryService;

  @Operation(summary = "강의 생성")
  @PostMapping("/courses")
  public ApiResponse<Long> createCourse(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @Valid @RequestBody InstructorCourseDto.CreateCourseRequest request) {
    Long courseId = instructorCourseService.createCourse(userId, request);
    return ApiResponse.success("강의가 생성되었습니다.", courseId);
  }

  @Operation(summary = "강의 상세 조회")
  @GetMapping("/courses/{courseId}")
  public ApiResponse<CourseDetailResponse> getCourseDetail(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @PathVariable Long courseId) {
    CourseDetailResponse response = instructorCourseQueryService.getCourseDetail(userId, courseId);
    return ApiResponse.success("강의 상세 정보를 조회했습니다.", response);
  }

  @Operation(summary = "강의 수정")
  @PutMapping("/courses/{courseId}")
  public ApiResponse<Void> updateCourse(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @PathVariable Long courseId,
      @Valid @RequestBody InstructorCourseDto.UpdateCourseRequest request) {
    instructorCourseService.updateCourse(userId, courseId, request);
    return ApiResponse.success("강의가 수정되었습니다.", null);
  }

  @Operation(summary = "강의 삭제")
  @DeleteMapping("/courses/{courseId}")
  public ApiResponse<Void> deleteCourse(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @PathVariable Long courseId) {
    instructorCourseService.deleteCourse(userId, courseId);
    return ApiResponse.success("강의가 삭제되었습니다.", null);
  }

  @Operation(summary = "강의 상태 변경")
  @PatchMapping("/courses/{courseId}/status")
  public ApiResponse<Void> updateCourseStatus(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @PathVariable Long courseId,
      @Valid @RequestBody InstructorCourseDto.UpdateStatusRequest request) {
    instructorCourseService.updateCourseStatus(userId, courseId, request);
    return ApiResponse.success("강의 상태가 변경되었습니다.", null);
  }
}
