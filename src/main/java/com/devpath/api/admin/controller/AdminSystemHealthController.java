package com.devpath.api.admin.controller;

import com.devpath.api.admin.dto.system.SystemHealthResponse;
import com.devpath.api.admin.service.AdminSystemHealthService;
import com.devpath.common.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/system")
@RequiredArgsConstructor
public class AdminSystemHealthController {

  private final AdminSystemHealthService adminSystemHealthService;

  @GetMapping("/health")
  public ApiResponse<SystemHealthResponse> getHealth() {
    return ApiResponse.success("시스템 상태를 확인했습니다.", adminSystemHealthService.checkHealth());
  }
}
