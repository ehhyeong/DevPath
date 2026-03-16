package com.devpath.api.learner.controller;

import com.devpath.api.learner.dto.CourseEnrollmentDto;
import com.devpath.api.learner.service.CourseEnrollmentService;
import com.devpath.common.response.ApiResponse;
import com.devpath.domain.course.entity.CourseEnrollment;
import com.devpath.domain.course.entity.EnrollmentStatus;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@Tag(name = "학습자 수강 신청", description = "학습자 수강 신청 API")
@RestController
@RequestMapping("/api/me/enrollments")
@RequiredArgsConstructor
public class CourseEnrollmentController {

    private final CourseEnrollmentService courseEnrollmentService;

    /**
     * 수강 신청
     */
    @Operation(summary = "수강 신청", description = "강의를 수강 신청합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<CourseEnrollmentDto.EnrollResponse>> enroll(
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody CourseEnrollmentDto.EnrollRequest request
    ) {
        CourseEnrollment enrollment = courseEnrollmentService.enroll(userId, request.getCourseId());

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(CourseEnrollmentDto.EnrollResponse.from(enrollment)));
    }

    /**
     * 내 수강 내역 조회 (전체)
     */
    @Operation(summary = "내 수강 내역 조회", description = "내가 수강 중인 모든 강의를 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<List<CourseEnrollmentDto.EnrollmentResponse>>> getMyEnrollments(
            @AuthenticationPrincipal Long userId
    ) {
        List<CourseEnrollment> enrollments = courseEnrollmentService.getMyEnrollments(userId);

        List<CourseEnrollmentDto.EnrollmentResponse> response = enrollments.stream()
                .map(CourseEnrollmentDto.EnrollmentResponse::from)
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    /**
     * 상태별 수강 내역 조회
     */
    @Operation(summary = "상태별 수강 내역 조회", description = "특정 상태의 수강 내역을 조회합니다. (ACTIVE, COMPLETED, CANCELLED, EXPIRED)")
    @GetMapping("/status/{status}")
    public ResponseEntity<ApiResponse<List<CourseEnrollmentDto.EnrollmentResponse>>> getEnrollmentsByStatus(
            @AuthenticationPrincipal Long userId,
            @PathVariable EnrollmentStatus status
    ) {
        List<CourseEnrollment> enrollments = courseEnrollmentService.getMyEnrollmentsByStatus(userId, status);

        List<CourseEnrollmentDto.EnrollmentResponse> response = enrollments.stream()
                .map(CourseEnrollmentDto.EnrollmentResponse::from)
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    /**
     * 진도율 업데이트
     */
    @Operation(summary = "진도율 업데이트", description = "강의 진도율을 업데이트합니다.")
    @PatchMapping("/courses/{courseId}/progress")
    public ResponseEntity<ApiResponse<Void>> updateProgress(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long courseId,
            @Valid @RequestBody CourseEnrollmentDto.UpdateProgressRequest request
    ) {
        courseEnrollmentService.updateProgress(userId, courseId, request.getProgressPercentage());

        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    /**
     * 마지막 접속 시간 업데이트
     */
    @Operation(summary = "마지막 접속 시간 업데이트", description = "강의 마지막 접속 시간을 업데이트합니다.")
    @PatchMapping("/courses/{courseId}/access")
    public ResponseEntity<ApiResponse<Void>> updateLastAccessed(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long courseId
    ) {
        courseEnrollmentService.updateLastAccessed(userId, courseId);

        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
