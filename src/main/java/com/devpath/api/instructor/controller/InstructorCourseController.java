package com.devpath.api.instructor.controller;

import com.devpath.api.common.dto.CourseDetailResponse;
import com.devpath.api.instructor.dto.InstructorCourseDto;
import com.devpath.api.instructor.dto.InstructorLessonDto;
import com.devpath.api.instructor.dto.InstructorMaterialDto;
import com.devpath.api.instructor.dto.InstructorSectionDto;
import com.devpath.api.instructor.service.InstructorCourseQueryService;
import com.devpath.api.instructor.service.InstructorCourseService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// Instructor APIs for managing owned courses, sections, lessons, and lesson assets.
@Tag(name = "강사용 강의 API", description = "강사가 자신의 강의와 부가 데이터를 관리하는 API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/instructor")
public class InstructorCourseController {

  private final InstructorCourseService instructorCourseService;
  private final InstructorCourseQueryService instructorCourseQueryService;

  @Operation(summary = "강의 생성")
  @PostMapping("/courses")
  public ApiResponse<Long> createCourse(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @Valid @RequestBody InstructorCourseDto.CreateCourseRequest request) {
    Long courseId = instructorCourseService.createCourse(userId, request);
    return ApiResponse.success("강의가 생성되었습니다.", courseId);
  }

  @Operation(summary = "강의 상세 조회")
  @GetMapping("/courses/{courseId}")
  public ApiResponse<CourseDetailResponse> getCourseDetail(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @PathVariable Long courseId) {
    CourseDetailResponse response = instructorCourseQueryService.getCourseDetail(userId, courseId);
    return ApiResponse.success("강의 상세 정보를 조회했습니다.", response);
  }

  @Operation(summary = "강의 수정")
  @PutMapping("/courses/{courseId}")
  public ApiResponse<Void> updateCourse(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @PathVariable Long courseId,
      @Valid @RequestBody InstructorCourseDto.UpdateCourseRequest request) {
    instructorCourseService.updateCourse(userId, courseId, request);
    return ApiResponse.success("강의가 수정되었습니다.", null);
  }

  @Operation(summary = "강의 삭제")
  @DeleteMapping("/courses/{courseId}")
  public ApiResponse<Void> deleteCourse(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @PathVariable Long courseId) {
    instructorCourseService.deleteCourse(userId, courseId);
    return ApiResponse.success("강의가 삭제되었습니다.", null);
  }

  @Operation(summary = "강의 상태 변경")
  @PatchMapping("/courses/{courseId}/status")
  public ApiResponse<Void> updateCourseStatus(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @PathVariable Long courseId,
      @Valid @RequestBody InstructorCourseDto.UpdateStatusRequest request) {
    instructorCourseService.updateCourseStatus(userId, courseId, request);
    return ApiResponse.success("강의 상태가 변경되었습니다.", null);
  }

  @Operation(summary = "섹션 생성")
  @PostMapping("/courses/{courseId}/sections")
  public ApiResponse<Long> createSection(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @PathVariable Long courseId,
      @Valid @RequestBody InstructorSectionDto.CreateSectionRequest request) {
    Long sectionId = instructorCourseService.createSection(userId, courseId, request);
    return ApiResponse.success("섹션이 생성되었습니다.", sectionId);
  }

  @Operation(summary = "섹션 수정")
  @PutMapping("/sections/{sectionId}")
  public ApiResponse<Void> updateSection(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @PathVariable Long sectionId,
      @Valid @RequestBody InstructorSectionDto.UpdateSectionRequest request) {
    instructorCourseService.updateSection(userId, sectionId, request);
    return ApiResponse.success("섹션이 수정되었습니다.", null);
  }

  @Operation(summary = "섹션 삭제")
  @DeleteMapping("/sections/{sectionId}")
  public ApiResponse<Void> deleteSection(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @PathVariable Long sectionId) {
    instructorCourseService.deleteSection(userId, sectionId);
    return ApiResponse.success("섹션이 삭제되었습니다.", null);
  }

  @Operation(summary = "레슨 생성")
  @PostMapping("/sections/{sectionId}/lessons")
  public ApiResponse<Long> createLesson(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @PathVariable Long sectionId,
      @Valid @RequestBody InstructorLessonDto.CreateLessonRequest request) {
    Long lessonId = instructorCourseService.createLesson(userId, sectionId, request);
    return ApiResponse.success("레슨이 생성되었습니다.", lessonId);
  }

  @Operation(summary = "레슨 수정")
  @PutMapping("/lessons/{lessonId}")
  public ApiResponse<Void> updateLesson(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @PathVariable Long lessonId,
      @Valid @RequestBody InstructorLessonDto.UpdateLessonRequest request) {
    instructorCourseService.updateLesson(userId, lessonId, request);
    return ApiResponse.success("레슨이 수정되었습니다.", null);
  }

  // This endpoint overwrites the prerequisite list so the client does not manage diffs.
  @Operation(summary = "레슨 선행 조건 전체 교체")
  @PutMapping("/lessons/{lessonId}/prerequisites")
  public ApiResponse<InstructorLessonDto.UpdateLessonPrerequisitesResponse>
      updateLessonPrerequisites(
          @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
          @PathVariable Long lessonId,
          @Valid @RequestBody InstructorLessonDto.UpdateLessonPrerequisitesRequest request) {
    InstructorLessonDto.UpdateLessonPrerequisitesResponse response =
        instructorCourseService.updateLessonPrerequisites(userId, lessonId, request);
    return ApiResponse.success("레슨 선행 조건이 저장되었습니다.", response);
  }

  @Operation(summary = "레슨 삭제")
  @DeleteMapping("/lessons/{lessonId}")
  public ApiResponse<Void> deleteLesson(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @PathVariable Long lessonId) {
    instructorCourseService.deleteLesson(userId, lessonId);
    return ApiResponse.success("레슨이 삭제되었습니다.", null);
  }

  @Operation(summary = "레슨 순서 변경")
  @PatchMapping("/lessons/order")
  public ApiResponse<Void> updateLessonOrder(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @Valid @RequestBody InstructorLessonDto.UpdateLessonOrderRequest request) {
    instructorCourseService.updateLessonOrder(userId, request);
    return ApiResponse.success("레슨 순서가 변경되었습니다.", null);
  }

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
