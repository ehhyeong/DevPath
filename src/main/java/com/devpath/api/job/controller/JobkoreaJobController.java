package com.devpath.api.job.controller;

import com.devpath.api.job.dto.JobkoreaJobRequest;
import com.devpath.api.job.dto.JobkoreaJobResponse;
import com.devpath.api.job.service.JobkoreaJobService;
import com.devpath.common.response.ApiResponse;
import com.devpath.common.swagger.SwaggerTag;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.time.Duration;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = SwaggerTag.JOB, description = "채용공고 API")
@RestController
@RequiredArgsConstructor
public class JobkoreaJobController {

  private final JobkoreaJobService jobkoreaJobService;

  @GetMapping("/api/jobs/company-logo")
  @Operation(summary = "잡코리아 등록 기업 로고 조회")
  public ResponseEntity<Void> getCompanyLogo(@RequestParam String companyPath) {
    return jobkoreaJobService
        .findCompanyLogo(companyPath)
        .map(
            logo ->
                ResponseEntity.status(HttpStatus.FOUND)
                    .cacheControl(CacheControl.maxAge(Duration.ofHours(1)).cachePublic())
                    .location(logo)
                    .<Void>build())
        .orElseGet(
            () ->
                ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .cacheControl(CacheControl.maxAge(Duration.ofMinutes(5)).cachePublic())
                    .build());
  }

  @GetMapping("/api/jobs/jobkorea")
  @Operation(
      tags = SwaggerTag.JOB,
      summary = "잡코리아 채용공고 조회",
      description = "잡코리아 XML API를 호출해 채용공고 목록을 조회합니다.")
  public ResponseEntity<ApiResponse<JobkoreaJobResponse.SearchResult>> searchJobkoreaJobs(
      @Valid @ModelAttribute JobkoreaJobRequest.Search request) {
    return ResponseEntity.ok(ApiResponse.ok(jobkoreaJobService.search(request)));
  }
}
