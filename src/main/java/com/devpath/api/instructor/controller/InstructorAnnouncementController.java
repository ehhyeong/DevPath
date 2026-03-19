package com.devpath.api.instructor.controller;

import com.devpath.api.instructor.dto.InstructorAnnouncementDto;
import com.devpath.api.instructor.service.InstructorAnnouncementQueryService;
import com.devpath.api.instructor.service.InstructorAnnouncementService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
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

@Tag(name = "강의 공지/새소식 API", description = "강의 공지 조회 및 관리 API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/instructor")
public class InstructorAnnouncementController {

  private final InstructorAnnouncementService instructorAnnouncementService;
  private final InstructorAnnouncementQueryService instructorAnnouncementQueryService;

  @Operation(summary = "강의 공지 등록")
  @PostMapping("/courses/{courseId}/announcements")
  public ApiResponse<Long> createAnnouncement(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @PathVariable Long courseId,
      @Valid @RequestBody InstructorAnnouncementDto.CreateAnnouncementRequest request) {
    Long announcementId =
        instructorAnnouncementService.createAnnouncement(userId, courseId, request);
    return ApiResponse.success("강의 공지가 등록되었습니다.", announcementId);
  }

  @Operation(summary = "강의 공지 목록 조회")
  @GetMapping("/courses/{courseId}/announcements")
  public ApiResponse<List<InstructorAnnouncementDto.AnnouncementSummaryResponse>> getAnnouncements(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @PathVariable Long courseId) {
    List<InstructorAnnouncementDto.AnnouncementSummaryResponse> response =
        instructorAnnouncementQueryService.getAnnouncements(userId, courseId);
    return ApiResponse.success("강의 공지 목록을 조회했습니다.", response);
  }

  @Operation(summary = "강의 공지 고정 여부 변경")
  @PatchMapping("/courses/{courseId}/announcements/{announcementId}/pin")
  public ApiResponse<Void> updateAnnouncementPin(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @PathVariable Long courseId,
      @PathVariable Long announcementId,
      @Valid @RequestBody InstructorAnnouncementDto.UpdateAnnouncementPinRequest request) {
    instructorAnnouncementService.updateAnnouncementPin(userId, courseId, announcementId, request);
    return ApiResponse.success("강의 공지 고정 여부가 변경되었습니다.", null);
  }

  @Operation(summary = "강의 공지 노출 순서 변경")
  @PatchMapping("/courses/{courseId}/announcements/order")
  public ApiResponse<Void> updateAnnouncementOrder(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @PathVariable Long courseId,
      @Valid @RequestBody InstructorAnnouncementDto.UpdateAnnouncementOrderRequest request) {
    instructorAnnouncementService.updateAnnouncementDisplayOrder(userId, courseId, request);
    return ApiResponse.success("강의 공지 노출 순서가 변경되었습니다.", null);
  }

  @Operation(summary = "강의 공지 상세 조회")
  @GetMapping("/announcements/{announcementId}")
  public ApiResponse<InstructorAnnouncementDto.AnnouncementDetailResponse> getAnnouncementDetail(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @PathVariable Long announcementId) {
    InstructorAnnouncementDto.AnnouncementDetailResponse response =
        instructorAnnouncementQueryService.getAnnouncementDetail(userId, announcementId);
    return ApiResponse.success("강의 공지 상세 정보를 조회했습니다.", response);
  }

  @Operation(summary = "강의 공지 수정")
  @PutMapping("/announcements/{announcementId}")
  public ApiResponse<Void> updateAnnouncement(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @PathVariable Long announcementId,
      @Valid @RequestBody InstructorAnnouncementDto.UpdateAnnouncementRequest request) {
    instructorAnnouncementService.updateAnnouncement(userId, announcementId, request);
    return ApiResponse.success("강의 공지가 수정되었습니다.", null);
  }

  @Operation(summary = "강의 공지 삭제")
  @DeleteMapping("/announcements/{announcementId}")
  public ApiResponse<Void> deleteAnnouncement(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @PathVariable Long announcementId) {
    instructorAnnouncementService.deleteAnnouncement(userId, announcementId);
    return ApiResponse.success("강의 공지가 삭제되었습니다.", null);
  }
}
