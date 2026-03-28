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
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Admin - Account Management", description = "관리자 계정 관리 API")
@RestController
@RequestMapping("/api/admin/accounts")
@RequiredArgsConstructor
public class AdminAccountController {

    private final AdminAccountService adminAccountService;

    @Operation(summary = "회원 목록 조회")
    @GetMapping
    public ApiResponse<List<AccountDetailResponse>> getAccounts() {
        return ApiResponse.success("회원 목록을 조회했습니다.", adminAccountService.getAccounts());
    }

    @Operation(summary = "회원 상세 조회")
    @GetMapping("/{userId}")
    public ApiResponse<AccountDetailResponse> getAccount(@PathVariable Long userId) {
        return ApiResponse.success("회원 정보를 조회했습니다.", adminAccountService.getAccount(userId));
    }

    @Operation(summary = "계정 제한 (강제 정지)")
    @PatchMapping("/{userId}/restrict")
    public ApiResponse<Void> restrictAccount(
            @PathVariable Long userId,
            @RequestBody @Valid AccountStatusUpdateRequest request,
            @Parameter(hidden = true) @AuthenticationPrincipal Long adminId) {
        adminAccountService.restrictAccount(userId, adminId, request);
        return ApiResponse.success("계정이 제한되었습니다.", null);
    }

    @Operation(summary = "계정 비활성화")
    @PatchMapping("/{userId}/deactivate")
    public ApiResponse<Void> deactivateAccount(
            @PathVariable Long userId,
            @RequestBody @Valid AccountStatusUpdateRequest request,
            @Parameter(hidden = true) @AuthenticationPrincipal Long adminId) {
        adminAccountService.deactivateAccount(userId, adminId, request);
        return ApiResponse.success("계정이 비활성화되었습니다.", null);
    }

    @Operation(summary = "계정 복구")
    @PatchMapping("/{userId}/restore")
    public ApiResponse<Void> restoreAccount(
            @PathVariable Long userId,
            @RequestBody @Valid AccountStatusUpdateRequest request,
            @Parameter(hidden = true) @AuthenticationPrincipal Long adminId) {
        adminAccountService.restoreAccount(userId, adminId, request);
        return ApiResponse.success("계정이 복구되었습니다.", null);
    }

    @Operation(summary = "탈퇴 처리")
    @PatchMapping("/{userId}/withdraw")
    public ApiResponse<Void> withdrawAccount(
            @PathVariable Long userId,
            @RequestBody @Valid AccountStatusUpdateRequest request,
            @Parameter(hidden = true) @AuthenticationPrincipal Long adminId) {
        adminAccountService.withdrawAccount(userId, adminId, request);
        return ApiResponse.success("탈퇴 처리가 완료되었습니다.", null);
    }

    @Operation(summary = "계정 처리 로그 조회", description = "처리 사유/처리자/처리시간 포함")
    @GetMapping("/{userId}/logs")
    public ApiResponse<List<AccountLogResponse>> getAccountLogs(@PathVariable Long userId) {
        return ApiResponse.success("계정 로그를 조회했습니다.", adminAccountService.getAccountLogs(userId));
    }
}