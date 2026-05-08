package com.devpath.api.instructor.controller;

import com.devpath.api.common.dto.CourseDetailResponse;
import com.devpath.api.instructor.dto.InstructorCourseDto;
import com.devpath.api.instructor.dto.course.InstructorCourseListResponse;
import com.devpath.api.instructor.service.InstructorCourseQueryService;
import com.devpath.api.instructor.service.InstructorCourseService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
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

@Tag(name = "강사 - 강의 관리", description = "강사 강의 관리 API")
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
    return ApiResponse.success("Course created.", courseId);
  }

  @Operation(summary = "강사 강의 목록 조회")
  @GetMapping("/courses")
  public ApiResponse<List<InstructorCourseListResponse>> getCourses(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.success(
        "Instructor courses loaded.", instructorCourseQueryService.getCourseList(userId));
  }

  @Operation(summary = "강의 상세 조회")
  @GetMapping("/courses/{courseId}")
  public ApiResponse<CourseDetailResponse> getCourseDetail(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId, @PathVariable Long courseId) {
    CourseDetailResponse response = instructorCourseQueryService.getCourseDetail(userId, courseId);
    return ApiResponse.success("Course detail loaded.", response);
  }

  @Operation(summary = "강의 수정")
  @PutMapping("/courses/{courseId}")
  public ApiResponse<Void> updateCourse(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @PathVariable Long courseId,
      @Valid @RequestBody InstructorCourseDto.UpdateCourseRequest request) {
    instructorCourseService.updateCourse(userId, courseId, request);
    return ApiResponse.success("Course updated.", null);
  }

  @Operation(summary = "강의 삭제")
  @DeleteMapping("/courses/{courseId}")
  public ApiResponse<Void> deleteCourse(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId, @PathVariable Long courseId) {
    instructorCourseService.deleteCourse(userId, courseId);
    return ApiResponse.success("Course deleted.", null);
  }

  @Operation(summary = "강의 상태 변경")
  @PatchMapping("/courses/{courseId}/status")
  public ApiResponse<Void> updateCourseStatus(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @PathVariable Long courseId,
      @Valid @RequestBody InstructorCourseDto.UpdateStatusRequest request) {
    instructorCourseService.updateCourseStatus(userId, courseId, request);
    return ApiResponse.success("Course status updated.", null);
  }
}
