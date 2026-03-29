package com.devpath.api.admin.service;

import com.devpath.api.admin.dto.permission.InstructorGradeUpdateRequest;
import com.devpath.api.admin.dto.permission.RoleCreateRequest;
import com.devpath.api.admin.dto.permission.RoleResponse;
import com.devpath.api.admin.dto.permission.UserPermissionResponse;
import com.devpath.api.admin.entity.AdminRole;
import com.devpath.api.admin.repository.AdminRoleRepository;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class AdminPermissionService {

    private final AdminRoleRepository adminRoleRepository;
    private final UserRepository userRepository;

    public RoleResponse createRole(RoleCreateRequest request) {
        AdminRole adminRole = AdminRole.builder()
                .roleName(request.getRoleName())
                .description(request.getDescription())
                .build();
        return RoleResponse.from(adminRoleRepository.save(adminRole));
    }

    public RoleResponse updateRole(Long roleId, RoleCreateRequest request) {
        AdminRole adminRole = adminRoleRepository.findByIdAndIsDeletedFalse(roleId)
                .orElseThrow(() -> new CustomException(ErrorCode.RESOURCE_NOT_FOUND));
        adminRole.update(request.getRoleName(), request.getDescription());
        return RoleResponse.from(adminRole);
    }

    @Transactional(readOnly = true)
    public List<RoleResponse> getRoles() {
        return adminRoleRepository.findByIsDeletedFalse().stream()
                .map(RoleResponse::from)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public UserPermissionResponse getUserPermission(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.RESOURCE_NOT_FOUND));
        return UserPermissionResponse.from(user);
    }

    public void changeInstructorGrade(Long userId, InstructorGradeUpdateRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.RESOURCE_NOT_FOUND));
        user.changeInstructorGrade(request.getGrade());
    }
}