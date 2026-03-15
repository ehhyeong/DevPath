package com.devpath.api.course.controller;

import com.devpath.api.course.dto.PublicCourseNewsDto;
import com.devpath.api.course.service.PublicCourseNewsQueryService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// 공개 강의 조회 API를 제공한다.
@Tag(name = "Public Course API", description = "공개 강의 조회 API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/courses")
public class PublicCourseController {

    private final PublicCourseNewsQueryService publicCourseNewsQueryService;

    // 공개 강의 상세의 새소식 탭 목록을 조회한다.
    @Operation(summary = "강의 새소식 탭 조회", description = "공개 강의 상세의 새소식 탭 목록을 조회합니다.")
    @GetMapping("/{courseId}/news")
    public ApiResponse<List<PublicCourseNewsDto.NewsItemResponse>> getCourseNews(
            @PathVariable Long courseId
    ) {
        List<PublicCourseNewsDto.NewsItemResponse> response =
                publicCourseNewsQueryService.getCourseNews(courseId);

        return ApiResponse.success("강의 새소식 탭을 조회했습니다.", response);
    }
}
