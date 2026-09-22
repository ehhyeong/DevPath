package com.devpath.api.home.controller;

import static com.devpath.common.security.AuthenticationUtils.requireUserId;

import com.devpath.api.home.dto.AuthenticatedHomeDto;
import com.devpath.api.home.service.AuthenticatedHomeService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "로그인 홈", description = "로그인 사용자의 홈 대시보드 조회 API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/home")
public class AuthenticatedHomeController {

  private final AuthenticatedHomeService authenticatedHomeService;

  @Operation(summary = "로그인 홈 조회", description = "현재 사용자의 학습, 프로젝트, 강의 데이터를 조회합니다.")
  @GetMapping("/dashboard")
  public ResponseEntity<ApiResponse<AuthenticatedHomeDto.DashboardResponse>> getDashboard(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ResponseEntity.ok(
        ApiResponse.ok(authenticatedHomeService.getDashboard(requireUserId(userId))));
  }
}
