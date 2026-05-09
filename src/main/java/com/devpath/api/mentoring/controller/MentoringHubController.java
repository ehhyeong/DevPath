package com.devpath.api.mentoring.controller;

import com.devpath.api.mentoring.dto.MentoringHubResponse;
import com.devpath.api.mentoring.service.MentoringHubService;
import com.devpath.common.response.ApiResponse;
import com.devpath.common.swagger.SwaggerTag;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = SwaggerTag.MENTORING_HUB, description = "멘토링 허브 및 내 멘토링 조회 API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/mentorings")
public class MentoringHubController {

  private final MentoringHubService mentoringHubService;

  @GetMapping("/hub")
  @Operation(summary = "멘토링 허브 탐색", description = "OPEN 상태의 멘토링 공고를 허브 화면 기준으로 조회합니다.")
  public ResponseEntity<ApiResponse<MentoringHubResponse.Hub>> getHub() {
    // Controller는 Service 호출과 공통 응답 반환만 담당한다.
    return ResponseEntity.ok(ApiResponse.ok(mentoringHubService.getHub()));
  }

  @GetMapping("/ongoing")
  @Operation(summary = "진행 중 멘토링 목록 조회", description = "ONGOING 상태의 멘토링 목록을 조회합니다.")
  public ResponseEntity<ApiResponse<List<MentoringHubResponse.Ongoing>>> getOngoingMentorings() {
    // 진행 중 멘토링은 ONGOING 상태만 응답한다.
    return ResponseEntity.ok(ApiResponse.ok(mentoringHubService.getOngoingMentorings()));
  }

  @GetMapping("/me")
  @Operation(summary = "내 멘토링 목록 조회", description = "내가 멘토 또는 멘티로 참여 중인 멘토링 목록을 조회합니다.")
  public ResponseEntity<ApiResponse<List<MentoringHubResponse.MyMentoring>>> getMyMentorings(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ResponseEntity.ok(ApiResponse.ok(mentoringHubService.getMyMentorings(userId)));
  }
}
