package com.devpath.api.report.controller;

import com.devpath.api.report.dto.ReportCreateRequest;
import com.devpath.api.report.dto.ReportCreateResponse;
import com.devpath.api.report.service.ReportSubmissionService;
import com.devpath.common.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportSubmissionController {

  private final ReportSubmissionService reportSubmissionService;

  @PostMapping
  public ResponseEntity<ApiResponse<ReportCreateResponse>> submit(
      @AuthenticationPrincipal Long userId, @Valid @RequestBody ReportCreateRequest request) {
    return ResponseEntity.ok(ApiResponse.ok(reportSubmissionService.submit(userId, request)));
  }
}
