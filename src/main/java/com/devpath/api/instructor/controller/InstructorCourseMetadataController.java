package com.devpath.api.instructor.controller;

import com.devpath.api.instructor.dto.InstructorCourseDto;
import com.devpath.api.instructor.dto.InstructorMaterialDto;
import com.devpath.api.instructor.service.InstructorCourseService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "강의 메타데이터/자료 관리 API", description = "강의 메타데이터, 목표, 수강 대상, 자료, 썸네일, 트레일러 관리 API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/instructor")
public class InstructorCourseMetadataController {

  private final InstructorCourseService instructorCourseService;

  @Operation(summary = "강의 메타데이터 수정")
  @PatchMapping("/courses/{courseId}/metadata")
  public ApiResponse<Void> updateCourseMetadata(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @PathVariable Long courseId,
      @Valid @RequestBody InstructorCourseDto.UpdateMetadataRequest request) {
    instructorCourseService.updateCourseMetadata(userId, courseId, request);
    return ApiResponse.success("강의 메타데이터가 수정되었습니다.", null);
  }

  @Operation(summary = "강의 목표 전체 교체")
  @PostMapping("/courses/{courseId}/objectives")
  public ApiResponse<Void> replaceObjectives(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @PathVariable Long courseId,
      @Valid @RequestBody InstructorCourseDto.ReplaceObjectivesRequest request) {
    instructorCourseService.replaceObjectives(userId, courseId, request);
    return ApiResponse.success("강의 목표가 저장되었습니다.", null);
  }

  @Operation(summary = "강의 수강 대상 전체 교체")
  @PostMapping("/courses/{courseId}/target-audiences")
  public ApiResponse<Void> replaceTargetAudiences(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @PathVariable Long courseId,
      @Valid @RequestBody InstructorCourseDto.ReplaceTargetAudiencesRequest request) {
    instructorCourseService.replaceTargetAudiences(userId, courseId, request);
    return ApiResponse.success("강의 수강 대상이 저장되었습니다.", null);
  }

  @Operation(summary = "레슨 자료 등록")
  @PostMapping("/lessons/{lessonId}/materials")
  public ApiResponse<Long> createMaterial(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @PathVariable Long lessonId,
      @Valid @RequestBody InstructorMaterialDto.CreateMaterialRequest request) {
    Long materialId = instructorCourseService.createMaterial(userId, lessonId, request);
    return ApiResponse.success("레슨 자료가 등록되었습니다.", materialId);
  }

  @Operation(summary = "강의 썸네일 등록")
  @PostMapping("/courses/{courseId}/thumbnail")
  public ApiResponse<Void> uploadThumbnail(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @PathVariable Long courseId,
      @Valid @RequestBody InstructorCourseDto.UploadThumbnailRequest request) {
    instructorCourseService.uploadThumbnail(userId, courseId, request);
    return ApiResponse.success("강의 썸네일이 등록되었습니다.", null);
  }

  @Operation(summary = "강의 트레일러 등록")
  @PostMapping("/courses/{courseId}/trailer")
  public ApiResponse<Void> uploadTrailer(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @PathVariable Long courseId,
      @Valid @RequestBody InstructorCourseDto.UploadTrailerRequest request) {
    instructorCourseService.uploadTrailer(userId, courseId, request);
    return ApiResponse.success("강의 트레일러가 등록되었습니다.", null);
  }
}
