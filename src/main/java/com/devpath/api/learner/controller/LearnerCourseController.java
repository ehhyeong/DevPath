package com.devpath.api.learner.controller;

import com.devpath.api.common.dto.CourseDetailResponse;
import com.devpath.api.common.dto.CourseListItemResponse;
import com.devpath.api.learner.service.LearnerCourseService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "학습자 강의 조회", description = "학습자 강의 조회 API")
@RestController
@RequestMapping("/api/courses")
@RequiredArgsConstructor
public class LearnerCourseController {

    private final LearnerCourseService learnerCourseService;

    @Operation(summary = "강의 목록 조회", description = "전체 강의 목록을 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<List<CourseListItemResponse>>> getCourseList(
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(learnerCourseService.getCourseList(userId)));
    }

    @Operation(summary = "강의 상세 조회", description = "강의 ID로 상세 정보를 조회합니다.")
    @GetMapping("/{courseId}")
    public ResponseEntity<ApiResponse<CourseDetailResponse>> getCourseDetail(
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
            @PathVariable Long courseId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(learnerCourseService.getCourseDetail(userId, courseId)));
    }
}
