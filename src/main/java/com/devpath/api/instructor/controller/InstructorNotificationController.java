package com.devpath.api.instructor.controller;

import com.devpath.api.instructor.dto.notification.NotificationResponse;
import com.devpath.api.instructor.service.InstructorNotificationService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "강사 - 알림", description = "강사 알림 API")
@RestController
@RequestMapping("/api/instructor/notifications")
@RequiredArgsConstructor
public class InstructorNotificationController {

  private final InstructorNotificationService instructorNotificationService;

  @Operation(summary = "강사 알림 목록 조회")
  @GetMapping
  public ApiResponse<List<NotificationResponse>> getNotifications(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.success(
        "Notifications loaded.", instructorNotificationService.getNotifications(userId));
  }

  @Operation(summary = "강사 알림 읽음 처리")
  @PatchMapping("/{notificationId}/read")
  public ApiResponse<Void> markAsRead(
      @PathVariable Long notificationId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    instructorNotificationService.markAsRead(userId, notificationId);
    return ApiResponse.success("Notification marked as read.", null);
  }
}
