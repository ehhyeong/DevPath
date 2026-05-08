package com.devpath.api.course.controller;

import com.devpath.api.course.dto.LectureCatalogMenuResponse;
import com.devpath.api.course.dto.PublicCourseNewsDto;
import com.devpath.api.course.service.LectureCatalogQueryService;
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

// 공개 강의 목록과 부가 정보를 조회하는 API를 제공한다.
@Tag(name = "공개 강의 API", description = "공개 강의 조회 API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/courses")
public class PublicCourseController {

  private final PublicCourseNewsQueryService publicCourseNewsQueryService;
  private final LectureCatalogQueryService lectureCatalogQueryService;

  // 강의 목록 상단 메뉴 구성을 공개 화면에 내려준다.
  @Operation(summary = "강의 메뉴 조회", description = "강의 목록 페이지에 필요한 메뉴 구성을 조회합니다.")
  @GetMapping("/catalog-menu")
  public ApiResponse<LectureCatalogMenuResponse> getCatalogMenu() {
    return ApiResponse.success("강의 메뉴를 조회했습니다.", lectureCatalogQueryService.getPublicMenu());
  }

  // 공개 강의 상세의 뉴스 탭 목록을 조회한다.
  @Operation(summary = "강의 뉴스 조회", description = "공개 강의 상세의 뉴스 탭 목록을 조회합니다.")
  @GetMapping("/{courseId}/news")
  public ApiResponse<List<PublicCourseNewsDto.NewsItemResponse>> getCourseNews(
      @PathVariable Long courseId) {
    List<PublicCourseNewsDto.NewsItemResponse> response =
        publicCourseNewsQueryService.getCourseNews(courseId);

    return ApiResponse.success("강의 뉴스를 조회했습니다.", response);
  }
}
