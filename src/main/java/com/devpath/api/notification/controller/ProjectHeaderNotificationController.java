package com.devpath.api.notification.controller;

import static com.devpath.common.security.AuthenticationUtils.requireUserId;

import com.devpath.api.notification.dto.ProjectHeaderNotificationResponse;
import com.devpath.api.notification.service.ProjectHeaderNotificationService;
import com.devpath.common.response.ApiResponse;
import com.devpath.common.swagger.SwaggerTag;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = SwaggerTag.NOTIFICATION, description = "프로젝트 헤더 알림 API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/project-header-notifications")
public class ProjectHeaderNotificationController {

  private final ProjectHeaderNotificationService notificationService;

  @GetMapping
  @Operation(summary = "프로젝트 헤더 알림 목록 조회")
  public ApiResponse<List<ProjectHeaderNotificationResponse>> getNotifications(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.ok(notificationService.getNotifications(requireUserId(userId)));
  }

  @PatchMapping("/read-all")
  @Operation(summary = "프로젝트 헤더 저장 알림 전체 읽음 처리")
  public ApiResponse<List<ProjectHeaderNotificationResponse>> markAllRead(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.ok(notificationService.markAllRead(requireUserId(userId)));
  }
}
