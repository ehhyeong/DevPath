package com.devpath.api.admin.controller;

import com.devpath.api.admin.dto.permission.RoleCreateRequest;
import com.devpath.api.admin.dto.permission.RoleResponse;
import com.devpath.api.admin.dto.permission.UserPermissionResponse;
import com.devpath.api.admin.service.AdminPermissionService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Admin - Permission", description = "관리자 권한 관리 API")
@RestController
@RequestMapping("/api/admin/permissions")
@RequiredArgsConstructor
public class AdminPermissionController {

    private final AdminPermissionService adminPermissionService;

    @Operation(summary = "관리자 Role 등록")
    @PostMapping("/roles")
    public ApiResponse<RoleResponse> createRole(@RequestBody @Valid RoleCreateRequest request) {
        return ApiResponse.success("Role이 등록되었습니다.", adminPermissionService.createRole(request));
    }

    @Operation(summary = "Role 수정")
    @PutMapping("/roles/{roleId}")
    public ApiResponse<RoleResponse> updateRole(
            @PathVariable Long roleId,
            @RequestBody @Valid RoleCreateRequest request) {
        return ApiResponse.success("Role이 수정되었습니다.", adminPermissionService.updateRole(roleId, request));
    }

    @Operation(summary = "Role 목록 조회")
    @GetMapping("/roles")
    public ApiResponse<List<RoleResponse>> getRoles() {
        return ApiResponse.success("Role 목록을 조회했습니다.", adminPermissionService.getRoles());
    }

    @Operation(summary = "사용자 권한 조회")
    @GetMapping("/users/{userId}")
    public ApiResponse<UserPermissionResponse> getUserPermission(@PathVariable Long userId) {
        return ApiResponse.success("사용자 권한을 조회했습니다.", adminPermissionService.getUserPermission(userId));
    }
}