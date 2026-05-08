package com.devpath.api.admin.controller;

import com.devpath.api.admin.dto.permission.InstructorGradeUpdateRequest;
import com.devpath.api.admin.dto.permission.RoleCreateRequest;
import com.devpath.api.admin.dto.permission.RoleResponse;
import com.devpath.api.admin.dto.permission.UserPermissionResponse;
import com.devpath.api.admin.service.AdminPermissionService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "관리자 - 권한 관리", description = "관리자 권한 관리 API")
@RestController
@RequestMapping("/api/admin/permissions")
@RequiredArgsConstructor
public class AdminPermissionController {

  private final AdminPermissionService adminPermissionService;

  @Operation(summary = "관리자 Role 등록", description = "관리자 Role과 권한 코드를 등록합니다.")
  @PostMapping("/roles")
  public ApiResponse<RoleResponse> createRole(@RequestBody @Valid RoleCreateRequest request) {
    return ApiResponse.success("Role이 등록되었습니다.", adminPermissionService.createRole(request));
  }

  @Operation(summary = "역할 수정", description = "기존 역할 이름, 설명, 권한 코드를 수정합니다.")
  @PutMapping("/roles/{roleId}")
  public ApiResponse<RoleResponse> updateRole(
      @PathVariable Long roleId, @RequestBody @Valid RoleCreateRequest request) {
    return ApiResponse.success(
        "Role이 수정되었습니다.", adminPermissionService.updateRole(roleId, request));
  }

  @Operation(summary = "역할 목록 조회", description = "삭제되지 않은 역할 목록을 조회합니다.")
  @GetMapping("/roles")
  public ApiResponse<List<RoleResponse>> getRoles() {
    return ApiResponse.success("Role 목록을 조회했습니다.", adminPermissionService.getRoles());
  }

  @Operation(summary = "사용자 권한 조회", description = "특정 사용자의 권한 정보를 조회합니다.")
  @GetMapping("/users/{userId}")
  public ApiResponse<UserPermissionResponse> getUserPermission(@PathVariable Long userId) {
    return ApiResponse.success("사용자 권한을 조회했습니다.", adminPermissionService.getUserPermission(userId));
  }

  @Operation(summary = "강사 등급 변경", description = "강사 등급을 변경합니다.")
  @PatchMapping("/users/{userId}/role")
  public ApiResponse<Void> changeInstructorGrade(
      @PathVariable Long userId, @RequestBody @Valid InstructorGradeUpdateRequest request) {
    adminPermissionService.changeInstructorGrade(userId, request);
    return ApiResponse.success("강사 등급이 변경되었습니다.", null);
  }
}
