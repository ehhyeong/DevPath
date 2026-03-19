package com.devpath.api.admin.controller;

import com.devpath.api.admin.dto.PendingCourseResponse;
import com.devpath.api.admin.service.AdminCourseGovernanceService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "관리자 강의 검수", description = "관리자 강의 검수 API")
@RestController
@RequestMapping("/api/admin/courses")
@RequiredArgsConstructor
public class AdminCourseGovernanceController {

    private final AdminCourseGovernanceService adminCourseGovernanceService;

    @Operation(summary = "승인 대기 강의 조회", description = "상태가 IN_REVIEW인 강의 목록을 조회합니다.")
    @GetMapping("/pending")
    public ApiResponse<List<PendingCourseResponse>> getPendingCourses() {
        List<PendingCourseResponse> response = adminCourseGovernanceService.getPendingCourses();
        // 규격에 맞게 ok(data) 사용
        return ApiResponse.ok(response);
    }

    @Operation(summary = "강의 승인", description = "대기 중인 강의를 승인(PUBLISHED) 처리합니다.")
    @PatchMapping("/{courseId}/approve")
    public ApiResponse<Void> approveCourse(@PathVariable Long courseId) {
        adminCourseGovernanceService.approveCourse(courseId);
        // 규격에 맞게 반환 데이터가 없을 때는 인자 없는 ok() 사용
        return ApiResponse.ok();
    }

    @Operation(summary = "강의 반려", description = "대기 중인 강의를 반려(DRAFT) 처리합니다.")
    @PatchMapping("/{courseId}/reject")
    public ApiResponse<Void> rejectCourse(@PathVariable Long courseId) {
        adminCourseGovernanceService.rejectCourse(courseId);
        // 규격에 맞게 반환 데이터가 없을 때는 인자 없는 ok() 사용
        return ApiResponse.ok();
    }
}
