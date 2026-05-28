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
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@Tag(name = "Instructor Course Metadata API", description = "Course metadata and media management APIs.")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/instructor")
public class InstructorCourseMetadataController {

  private final InstructorCourseService instructorCourseService;

  @Operation(summary = "Update course metadata")
  @PatchMapping("/courses/{courseId}/metadata")
  public ApiResponse<Void> updateCourseMetadata(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @PathVariable Long courseId,
      @Valid @RequestBody InstructorCourseDto.UpdateMetadataRequest request) {
    instructorCourseService.updateCourseMetadata(userId, courseId, request);
    return ApiResponse.success("Course metadata updated.", null);
  }

  @Operation(summary = "Replace course objectives")
  @PostMapping("/courses/{courseId}/objectives")
  public ApiResponse<Void> replaceObjectives(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @PathVariable Long courseId,
      @Valid @RequestBody InstructorCourseDto.ReplaceObjectivesRequest request) {
    instructorCourseService.replaceObjectives(userId, courseId, request);
    return ApiResponse.success("Course objectives saved.", null);
  }

  @Operation(summary = "Replace course target audiences")
  @PostMapping("/courses/{courseId}/target-audiences")
  public ApiResponse<Void> replaceTargetAudiences(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @PathVariable Long courseId,
      @Valid @RequestBody InstructorCourseDto.ReplaceTargetAudiencesRequest request) {
    instructorCourseService.replaceTargetAudiences(userId, courseId, request);
    return ApiResponse.success("Course target audiences saved.", null);
  }

  @Operation(summary = "Replace course info sections")
  @PostMapping("/courses/{courseId}/info-sections")
  public ApiResponse<Void> replaceInfoSections(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @PathVariable Long courseId,
      @Valid @RequestBody InstructorCourseDto.ReplaceInfoSectionsRequest request) {
    instructorCourseService.replaceInfoSections(userId, courseId, request);
    return ApiResponse.success("Course info sections saved.", null);
  }

  @Operation(summary = "Create lesson material")
  @PostMapping("/lessons/{lessonId}/materials")
  public ApiResponse<Long> createMaterial(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @PathVariable Long lessonId,
      @Valid @RequestBody InstructorMaterialDto.CreateMaterialRequest request) {
    Long materialId = instructorCourseService.createMaterial(userId, lessonId, request);
    return ApiResponse.success("Lesson material created.", materialId);
  }

  @Operation(summary = "Upload course asset")
  @PostMapping(value = "/uploads/course-assets", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public ApiResponse<InstructorCourseDto.UploadedAssetResponse> uploadCourseAsset(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @RequestParam("file") MultipartFile file,
      @RequestParam(value = "assetType", required = false) String assetType) {
    InstructorCourseDto.UploadedAssetResponse response =
        instructorCourseService.uploadCourseAsset(userId, file, assetType);
    return ApiResponse.success("Course asset uploaded.", response);
  }

  @Operation(summary = "Save course thumbnail")
  @PostMapping("/courses/{courseId}/thumbnail")
  public ApiResponse<Void> uploadThumbnail(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @PathVariable Long courseId,
      @Valid @RequestBody InstructorCourseDto.UploadThumbnailRequest request) {
    instructorCourseService.uploadThumbnail(userId, courseId, request);
    return ApiResponse.success("Course thumbnail saved.", null);
  }

  @Operation(summary = "Save course trailer")
  @PostMapping("/courses/{courseId}/trailer")
  public ApiResponse<Void> uploadTrailer(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @PathVariable Long courseId,
      @Valid @RequestBody InstructorCourseDto.UploadTrailerRequest request) {
    instructorCourseService.uploadTrailer(userId, courseId, request);
    return ApiResponse.success("Course trailer saved.", null);
  }
}
