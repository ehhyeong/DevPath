package com.devpath.api.admin.service;

import com.devpath.api.admin.dto.permission.InstructorGradeUpdateRequest;
import com.devpath.api.admin.dto.permission.RoleCreateRequest;
import com.devpath.api.admin.dto.permission.RoleResponse;
import com.devpath.api.admin.dto.permission.UserPermissionResponse;
import com.devpath.api.admin.entity.AdminPermission;
import com.devpath.api.admin.entity.AdminRole;
import com.devpath.api.admin.repository.AdminPermissionRepository;
import com.devpath.api.admin.repository.AdminRoleRepository;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.user.entity.AccountStatus;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class AdminPermissionService {

  private final AdminRoleRepository adminRoleRepository;
  private final AdminPermissionRepository adminPermissionRepository;
  private final UserRepository userRepository;

  public RoleResponse createRole(RoleCreateRequest request) {
    validateCreateRoleName(request.getRoleName());

    AdminRole adminRole =
        AdminRole.builder()
            .roleName(request.getRoleName().trim())
            .description(request.getDescription())
            .build();

    AdminRole savedRole = adminRoleRepository.save(adminRole);
    savePermissions(savedRole, normalizePermissionCodes(request.getPermissionCodes()));

    return RoleResponse.from(savedRole, getPermissionCodes(savedRole.getId()));
  }

  public RoleResponse updateRole(Long roleId, RoleCreateRequest request) {
    AdminRole adminRole =
        adminRoleRepository
            .findByIdAndIsDeletedFalse(roleId)
            .orElseThrow(() -> new CustomException(ErrorCode.RESOURCE_NOT_FOUND));

    validateUpdateRoleName(roleId, request.getRoleName());

    adminRole.update(request.getRoleName().trim(), request.getDescription());

    adminPermissionRepository
        .findByAdminRoleIdAndIsDeletedFalse(roleId)
        .forEach(AdminPermission::delete);

    savePermissions(adminRole, normalizePermissionCodes(request.getPermissionCodes()));

    return RoleResponse.from(adminRole, getPermissionCodes(adminRole.getId()));
  }

  @Transactional(readOnly = true)
  public List<RoleResponse> getRoles() {
    return adminRoleRepository.findByIsDeletedFalse().stream()
        .map(role -> RoleResponse.from(role, getPermissionCodes(role.getId())))
        .toList();
  }

  @Transactional(readOnly = true)
  public UserPermissionResponse getUserPermission(Long userId) {
    User user =
        userRepository
            .findById(userId)
            .orElseThrow(() -> new CustomException(ErrorCode.ACCOUNT_NOT_FOUND));

    return UserPermissionResponse.from(user);
  }

  public void changeInstructorGrade(Long userId, InstructorGradeUpdateRequest request) {
    User user =
        userRepository
            .findById(userId)
            .orElseThrow(() -> new CustomException(ErrorCode.ACCOUNT_NOT_FOUND));

    // 탈퇴/비활성 계정의 강사 등급은 운영상 변경하지 않는다.
    if (user.getAccountStatus() != AccountStatus.ACTIVE) {
      throw new CustomException(ErrorCode.INVALID_STATUS_TRANSITION);
    }

    user.changeInstructorGrade(request.getGrade());
  }

  // role에 연결된 permission row를 일괄 저장한다.
  private void savePermissions(AdminRole adminRole, List<String> permissionCodes) {
    for (String code : permissionCodes) {
      adminPermissionRepository.save(
          AdminPermission.builder()
              .adminRole(adminRole)
              .permissionCode(code)
              .description(code)
              .build());
    }
  }

  // 권한 코드는 공백 제거, 중복 제거 후 저장한다.
  private List<String> normalizePermissionCodes(List<String> permissionCodes) {
    if (permissionCodes == null) {
      return List.of();
    }

    return permissionCodes.stream()
        .filter(code -> code != null && !code.isBlank())
        .map(String::trim)
        .distinct()
        .toList();
  }

  private void validateCreateRoleName(String roleName) {
    String normalized = roleName == null ? "" : roleName.trim();
    if (normalized.isBlank()) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }

    if (adminRoleRepository.existsByRoleNameAndIsDeletedFalse(normalized)) {
      throw new CustomException(ErrorCode.DUPLICATE_RESOURCE);
    }
  }

  private void validateUpdateRoleName(Long roleId, String roleName) {
    String normalized = roleName == null ? "" : roleName.trim();
    if (normalized.isBlank()) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }

    if (adminRoleRepository.existsByRoleNameAndIsDeletedFalseAndIdNot(normalized, roleId)) {
      throw new CustomException(ErrorCode.DUPLICATE_RESOURCE);
    }
  }

  // 응답 DTO에는 현재 활성 permission code 목록만 내려준다.
  private List<String> getPermissionCodes(Long roleId) {
    return adminPermissionRepository.findByAdminRoleIdAndIsDeletedFalse(roleId).stream()
        .map(AdminPermission::getPermissionCode)
        .toList();
  }
}
