package com.devpath.api.admin.controller;

import com.devpath.api.admin.dto.account.AccountDetailResponse;
import com.devpath.api.admin.dto.account.AccountLogResponse;
import com.devpath.api.admin.dto.account.AccountStatusUpdateRequest;
import com.devpath.api.admin.service.AdminAccountService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "관리자 - 계정 관리", description = "관리자 계정 관리 API")
@RestController
@RequestMapping("/api/admin/accounts")
@RequiredArgsConstructor
public class AdminAccountController {

  private final AdminAccountService adminAccountService;

  @Operation(summary = "회원 목록 조회", description = "운영 대상 회원 목록을 조회합니다.")
  @GetMapping
  public ApiResponse<List<AccountDetailResponse>> getAccounts() {
    return ApiResponse.success("회원 목록을 조회했습니다.", adminAccountService.getAccounts());
  }

  @Operation(summary = "회원 상세 조회", description = "특정 회원의 계정 상세 정보를 조회합니다.")
  @GetMapping("/{userId}")
  public ApiResponse<AccountDetailResponse> getAccount(@PathVariable Long userId) {
    return ApiResponse.success("회원 정보를 조회했습니다.", adminAccountService.getAccount(userId));
  }

  @Operation(summary = "계정 제한", description = "ACTIVE 계정을 RESTRICTED 상태로 변경합니다.")
  @PatchMapping("/{userId}/restrict")
  public ApiResponse<Void> restrictAccount(
      @PathVariable Long userId,
      @RequestBody @Valid AccountStatusUpdateRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal Long adminId) {
    adminAccountService.restrictAccount(userId, adminId, request);
    return ApiResponse.success("계정이 제한되었습니다.", null);
  }

  @Operation(summary = "계정 비활성화", description = "ACTIVE 계정을 DEACTIVATED 상태로 변경합니다.")
  @PatchMapping("/{userId}/deactivate")
  public ApiResponse<Void> deactivateAccount(
      @PathVariable Long userId,
      @RequestBody @Valid AccountStatusUpdateRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal Long adminId) {
    adminAccountService.deactivateAccount(userId, adminId, request);
    return ApiResponse.success("계정이 비활성화되었습니다.", null);
  }

  @Operation(summary = "계정 복구", description = "RESTRICTED 또는 DEACTIVATED 계정을 ACTIVE로 복구합니다.")
  @PatchMapping("/{userId}/restore")
  public ApiResponse<Void> restoreAccount(
      @PathVariable Long userId,
      @RequestBody @Valid AccountStatusUpdateRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal Long adminId) {
    adminAccountService.restoreAccount(userId, adminId, request);
    return ApiResponse.success("계정이 복구되었습니다.", null);
  }

  @Operation(summary = "탈퇴 처리", description = "계정을 WITHDRAWN 상태로 변경합니다.")
  @PatchMapping("/{userId}/withdraw")
  public ApiResponse<Void> withdrawAccount(
      @PathVariable Long userId,
      @RequestBody @Valid AccountStatusUpdateRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal Long adminId) {
    adminAccountService.withdrawAccount(userId, adminId, request);
    return ApiResponse.success("탈퇴 처리가 완료되었습니다.", null);
  }

  @Operation(summary = "강사 가입 승인", description = "강사 승인 대기 사용자를 강사로 승인합니다.")
  @PatchMapping("/{userId}/approve-instructor")
  public ApiResponse<Void> approveInstructor(
      @PathVariable Long userId,
      @RequestBody @Valid AccountStatusUpdateRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal Long adminId) {
    adminAccountService.approveInstructor(userId, adminId, request);
    return ApiResponse.success("강사 가입이 승인되었습니다.", null);
  }

  @Operation(summary = "계정 처리 로그 조회", description = "사유, 처리자, 처리시간이 포함된 계정 처리 로그를 조회합니다.")
  @GetMapping("/{userId}/logs")
  public ApiResponse<List<AccountLogResponse>> getAccountLogs(@PathVariable Long userId) {
    return ApiResponse.success("계정 로그를 조회했습니다.", adminAccountService.getAccountLogs(userId));
  }
}
