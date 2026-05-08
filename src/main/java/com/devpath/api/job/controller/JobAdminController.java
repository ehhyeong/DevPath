package com.devpath.api.job.controller;

import com.devpath.api.job.dto.CompanyRequest;
import com.devpath.api.job.dto.CompanyResponse;
import com.devpath.api.job.dto.JobPostingRequest;
import com.devpath.api.job.dto.JobPostingResponse;
import com.devpath.api.job.service.JobAdminService;
import com.devpath.common.response.ApiResponse;
import com.devpath.common.swagger.SwaggerTag;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = SwaggerTag.JOB_ADMIN, description = "관리자 채용 공고 수집 및 등록 API")
@Tag(name = SwaggerTag.COMPANY, description = "기업 프로필 및 기업 인증 API")
@RestController
@RequiredArgsConstructor
public class JobAdminController {

  private final JobAdminService jobAdminService;

  @PostMapping("/api/admin/jobs/collect")
  @Operation(
      tags = SwaggerTag.JOB_ADMIN,
      summary = "외부 채용 데이터 수집",
      description = "외부 채용 데이터 수집 요청을 처리하고 결과를 반환합니다.")
  public ResponseEntity<ApiResponse<JobPostingResponse.CollectResult>> collectJobs(
      @Valid @RequestBody JobPostingRequest.Collect request) {
    return ResponseEntity.ok(ApiResponse.ok(jobAdminService.collectJobs(request)));
  }

  @PostMapping("/api/admin/jobs")
  @Operation(tags = SwaggerTag.JOB_ADMIN, summary = "채용 공고 등록", description = "관리자가 채용 공고를 등록합니다.")
  public ResponseEntity<ApiResponse<JobPostingResponse.Detail>> createJob(
      @Valid @RequestBody JobPostingRequest.Create request) {
    return ResponseEntity.ok(ApiResponse.ok(jobAdminService.createJob(request)));
  }

  @GetMapping("/api/jobs")
  @Operation(
      tags = SwaggerTag.JOB,
      summary = "채용 공고 목록 조회",
      description = "OPEN 상태의 채용 공고 목록을 조회합니다.")
  public ResponseEntity<ApiResponse<List<JobPostingResponse.Summary>>> getJobs() {
    return ResponseEntity.ok(ApiResponse.ok(jobAdminService.getOpenJobs()));
  }

  @GetMapping("/api/jobs/{jobId}")
  @Operation(tags = SwaggerTag.JOB, summary = "채용 공고 단건 조회", description = "채용 공고 상세 정보를 조회합니다.")
  public ResponseEntity<ApiResponse<JobPostingResponse.Detail>> getJob(@PathVariable Long jobId) {
    return ResponseEntity.ok(ApiResponse.ok(jobAdminService.getJob(jobId)));
  }

  @PatchMapping("/api/admin/jobs/{jobId}")
  @Operation(
      tags = SwaggerTag.JOB_ADMIN,
      summary = "채용 공고 수정",
      description = "관리자가 채용 공고 정보를 수정합니다.")
  public ResponseEntity<ApiResponse<JobPostingResponse.Detail>> updateJob(
      @PathVariable Long jobId, @Valid @RequestBody JobPostingRequest.Update request) {
    return ResponseEntity.ok(ApiResponse.ok(jobAdminService.updateJob(jobId, request)));
  }

  @PostMapping("/api/admin/companies")
  @Operation(tags = SwaggerTag.COMPANY, summary = "기업 프로필 생성", description = "관리자가 기업 프로필을 생성합니다.")
  public ResponseEntity<ApiResponse<CompanyResponse.Detail>> createCompany(
      @Valid @RequestBody CompanyRequest.Create request) {
    return ResponseEntity.ok(ApiResponse.ok(jobAdminService.createCompany(request)));
  }

  @GetMapping("/api/admin/companies")
  @Operation(tags = SwaggerTag.COMPANY, summary = "기업 목록 조회", description = "관리자가 기업 목록을 조회합니다.")
  public ResponseEntity<ApiResponse<List<CompanyResponse.Summary>>> getCompanies() {
    return ResponseEntity.ok(ApiResponse.ok(jobAdminService.getCompanies()));
  }

  @GetMapping("/api/admin/companies/{companyId}")
  @Operation(tags = SwaggerTag.COMPANY, summary = "기업 단건 조회", description = "관리자가 기업 상세 정보를 조회합니다.")
  public ResponseEntity<ApiResponse<CompanyResponse.Detail>> getCompany(
      @PathVariable Long companyId) {
    return ResponseEntity.ok(ApiResponse.ok(jobAdminService.getCompany(companyId)));
  }

  @PatchMapping("/api/admin/companies/{companyId}")
  @Operation(
      tags = SwaggerTag.COMPANY,
      summary = "기업 정보 수정",
      description = "관리자가 기업 프로필 정보를 수정합니다.")
  public ResponseEntity<ApiResponse<CompanyResponse.Detail>> updateCompany(
      @PathVariable Long companyId, @Valid @RequestBody CompanyRequest.Update request) {
    return ResponseEntity.ok(ApiResponse.ok(jobAdminService.updateCompany(companyId, request)));
  }

  @PatchMapping("/api/admin/companies/{companyId}/verify")
  @Operation(tags = SwaggerTag.COMPANY, summary = "기업 인증 처리", description = "관리자가 기업 인증 상태를 변경합니다.")
  public ResponseEntity<ApiResponse<CompanyResponse.Detail>> verifyCompany(
      @PathVariable Long companyId, @Valid @RequestBody CompanyRequest.Verify request) {
    return ResponseEntity.ok(ApiResponse.ok(jobAdminService.verifyCompany(companyId, request)));
  }
}
