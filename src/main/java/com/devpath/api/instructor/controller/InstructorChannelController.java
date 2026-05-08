package com.devpath.api.instructor.controller;

import com.devpath.api.instructor.dto.channel.ChannelInfoUpdateRequest;
import com.devpath.api.instructor.dto.channel.ChannelProfileUpdateRequest;
import com.devpath.api.instructor.service.InstructorChannelService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@Tag(name = "강사 - 채널", description = "강사 채널 관리 API")
@RestController
@RequestMapping("/api/instructor/channel")
@RequiredArgsConstructor
public class InstructorChannelController {

  private final InstructorChannelService instructorChannelService;

  @Operation(summary = "강사 프로필 수정", description = "소개글, 링크, 전문분야 등을 수정합니다.")
  @PutMapping("/profile")
  public ApiResponse<Void> updateProfile(
      @RequestBody @Valid ChannelProfileUpdateRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    instructorChannelService.updateProfile(userId, request);
    return ApiResponse.success("프로필이 수정되었습니다.", null);
  }

  @Operation(summary = "강사 채널 정보 수정", description = "채널명, 채널 설명을 수정합니다.")
  @PutMapping("/info")
  public ApiResponse<Void> updateChannelInfo(
      @RequestBody @Valid ChannelInfoUpdateRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    instructorChannelService.updateChannelInfo(userId, request);
    return ApiResponse.success("채널 정보가 수정되었습니다.", null);
  }
}
