package com.devpath.api.admin.controller;

import com.devpath.api.admin.dto.catalog.LectureCatalogMenuUpdateRequest;
import com.devpath.api.admin.service.AdminLectureCatalogService;
import com.devpath.api.course.dto.LectureCatalogMenuResponse;
import com.devpath.api.course.service.LectureCatalogQueryService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// 관리자 강의 메뉴 편집 화면에서 사용하는 메뉴 조회/저장 API를 제공한다.
@Tag(name = "관리자 - 강의 카탈로그", description = "관리자 강의 목록 메뉴 관리 API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin/course-catalog")
public class AdminLectureCatalogController {

  private final LectureCatalogQueryService lectureCatalogQueryService;
  private final AdminLectureCatalogService adminLectureCatalogService;

  @Operation(summary = "강의 메뉴 조회")
  @GetMapping
  public ApiResponse<LectureCatalogMenuResponse> getMenu() {
    return ApiResponse.success("강의 메뉴를 조회했습니다.", lectureCatalogQueryService.getAdminMenu());
  }

  @Operation(summary = "강의 메뉴 저장")
  @PutMapping
  public ApiResponse<LectureCatalogMenuResponse> replaceMenu(
      @RequestBody @Valid LectureCatalogMenuUpdateRequest request) {
    adminLectureCatalogService.replaceMenu(request);
    return ApiResponse.success("강의 메뉴를 저장했습니다.", lectureCatalogQueryService.getAdminMenu());
  }
}
