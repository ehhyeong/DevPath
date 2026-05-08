package com.devpath.api.project.controller;

import static com.devpath.common.security.AuthenticationUtils.requireUserId;

import com.devpath.api.project.dto.ProjectAdvancedRequests.MentoringRequest;
import com.devpath.api.project.dto.ProjectAdvancedResponses.MentoringResponse;
import com.devpath.api.project.service.MentoringApplicationService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController("projectMentoringApplicationController")
@RequestMapping("/api/projects/mentoring-applications")
@RequiredArgsConstructor
@Tag(name = "프로젝트 - 멘토링", description = "프로젝트 멘토링 신청 API")
public class MentoringApplicationController {

  private final MentoringApplicationService mentoringApplicationService;

  @PostMapping
  @Operation(summary = "프로젝트 멘토링 신청", description = "프로젝트에 대한 멘토링을 신청합니다.")
  public ApiResponse<MentoringResponse> applyForMentoring(
      @Valid @RequestBody MentoringRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal Long requesterId) {
    return ApiResponse.ok(
        mentoringApplicationService.applyForMentoring(request, requireUserId(requesterId)));
  }

  @GetMapping
  @Operation(summary = "프로젝트 멘토링 신청 목록 조회", description = "프로젝트의 멘토링 신청 목록을 조회합니다.")
  public ApiResponse<List<MentoringResponse>> getMentoringApplications(
      @RequestParam Long projectId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long requesterId) {
    return ApiResponse.ok(
        mentoringApplicationService.getMentoringApplications(
            projectId, requireUserId(requesterId)));
  }
}
