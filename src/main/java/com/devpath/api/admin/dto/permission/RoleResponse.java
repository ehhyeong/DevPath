package com.devpath.api.admin.dto.permission;

import com.devpath.api.admin.entity.AdminRole;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class RoleResponse {

    private Long id;
    private String roleName;
    private String description;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static RoleResponse from(AdminRole adminRole) {
        return RoleResponse.builder()
                .id(adminRole.getId())
                .roleName(adminRole.getRoleName())
                .description(adminRole.getDescription())
                .createdAt(adminRole.getCreatedAt())
                .updatedAt(adminRole.getUpdatedAt())
                .build();
    }
}