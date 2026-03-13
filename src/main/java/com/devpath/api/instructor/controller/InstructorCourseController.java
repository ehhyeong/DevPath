package com.devpath.api.instructor.controller;

import com.devpath.api.instructor.dto.InstructorCourseDto;
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
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
            @PathVariable Long courseId) {
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
}