package com.devpath.api.instructor.controller;

import com.devpath.api.instructor.dto.InstructorChannelDto;
import com.devpath.api.instructor.dto.InstructorPublicProfileDto;
import com.devpath.api.instructor.service.PublicInstructorQueryService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// Public API for loading instructor profile and channel summaries.
@Tag(name = "Public Instructor API", description = "강사 공개 프로필/채널 조회 API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/instructors")
public class PublicInstructorController {

  private final PublicInstructorQueryService publicInstructorQueryService;

  @Operation(summary = "강사 공개 프로필 조회", description = "공개 상태인 강사의 프로필 요약 정보를 조회합니다.")
  @GetMapping("/{instructorId}/profile")
  public ApiResponse<InstructorPublicProfileDto.ProfileResponse> getPublicInstructorProfile(
      @PathVariable Long instructorId) {
    InstructorPublicProfileDto.ProfileResponse response =
        publicInstructorQueryService.getPublicProfile(instructorId);

    return ApiResponse.success("강사 공개 프로필을 조회했습니다.", response);
  }

  @Operation(summary = "강사 채널 상세 조회", description = "강사의 소개, 전문분야, 외부 링크, 대표 강의를 조회합니다.")
  @GetMapping("/{instructorId}/channel")
  public ApiResponse<InstructorChannelDto.ChannelResponse> getPublicInstructorChannel(
      @PathVariable Long instructorId) {
    InstructorChannelDto.ChannelResponse response =
        publicInstructorQueryService.getPublicChannel(instructorId);

    return ApiResponse.success("강사 채널 상세 정보를 조회했습니다.", response);
  }
}
