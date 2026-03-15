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

@Tag(name = "Learner - Course", description = "?숈뒿??媛뺤쓽 議고쉶 API")
@RestController
@RequestMapping("/api/courses")
@RequiredArgsConstructor
public class LearnerCourseController {

    private final LearnerCourseService learnerCourseService;

    @Operation(summary = "媛뺤쓽 紐⑸줉 議고쉶", description = "?꾩껜 媛뺤쓽 紐⑸줉??議고쉶?⑸땲??")
    @GetMapping
    public ResponseEntity<ApiResponse<List<CourseListItemResponse>>> getCourseList(
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(learnerCourseService.getCourseList(userId)));
    }

    @Operation(summary = "媛뺤쓽 ?곸꽭 議고쉶", description = "媛뺤쓽 ID濡??곸꽭 ?뺣낫瑜?議고쉶?⑸땲??")
    @GetMapping("/{courseId}")
    public ResponseEntity<ApiResponse<CourseDetailResponse>> getCourseDetail(
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
            @PathVariable Long courseId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(learnerCourseService.getCourseDetail(userId, courseId)));
    }
}
