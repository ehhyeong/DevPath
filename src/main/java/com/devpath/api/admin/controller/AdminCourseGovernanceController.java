package com.devpath.api.admin.controller;

import com.devpath.api.admin.dto.governance.CourseApproveRequest;
import com.devpath.api.admin.dto.governance.CourseRejectRequest;
import com.devpath.api.admin.dto.governance.CourseReviewDetailResponse;
import com.devpath.api.admin.dto.governance.CourseReviewHistoryResponse;
import com.devpath.api.admin.dto.governance.PendingCourseResponse;
import com.devpath.api.admin.service.AdminCourseGovernanceService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@Tag(name = "관리자 - 강의 거버넌스", description = "관리자 강의 거버넌스 API")
@RestController
@RequestMapping("/api/admin/courses")
@RequiredArgsConstructor
public class AdminCourseGovernanceController {

  private final AdminCourseGovernanceService adminCourseGovernanceService;

  @Operation(summary = "강의 승인 대기 목록 조회")
  @GetMapping("/pending")
  public ApiResponse<List<PendingCourseResponse>> getPendingCourses() {
    return ApiResponse.success(
        "승인 대기 강의 목록을 조회했습니다.", adminCourseGovernanceService.getPendingCourses());
  }

  @Operation(summary = "강의 검수 상세 조회")
  @GetMapping("/{courseId}/review")
  public ApiResponse<CourseReviewDetailResponse> getCourseReview(
      @PathVariable Long courseId, @AuthenticationPrincipal Long adminId) {
    return ApiResponse.success(
        "강의 검수 상세를 조회했습니다.", adminCourseGovernanceService.getCourseReview(courseId, adminId));
  }

  @Operation(summary = "강의 승인")
  @PatchMapping("/{courseId}/approve")
  public ApiResponse<Void> approveCourse(
      @PathVariable Long courseId,
      @RequestBody @Valid CourseApproveRequest request,
      @AuthenticationPrincipal Long adminId) {
    adminCourseGovernanceService.approveCourse(courseId, adminId, request);
    return ApiResponse.success("강의가 승인되었습니다.", null);
  }

  @Operation(summary = "강의 반려")
  @PatchMapping("/{courseId}/reject")
  public ApiResponse<Void> rejectCourse(
      @PathVariable Long courseId,
      @RequestBody @Valid CourseRejectRequest request,
      @AuthenticationPrincipal Long adminId) {
    adminCourseGovernanceService.rejectCourse(courseId, adminId, request);
    return ApiResponse.success("강의가 반려되었습니다.", null);
  }

  @GetMapping("/review-history")
  public ApiResponse<List<CourseReviewHistoryResponse>> getReviewHistory() {
    return ApiResponse.success(
        "강의 검수 이력을 조회했습니다.", adminCourseGovernanceService.getReviewHistory());
  }
}
