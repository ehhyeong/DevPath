package com.devpath.api.admin.dto.permission;

import com.devpath.api.admin.entity.AdminRole;
import java.time.LocalDateTime;
import java.util.List;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class RoleResponse {

  private Long id;
  private String roleName;
  private String description;
  private List<String> permissionCodes;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;

  public static RoleResponse from(AdminRole adminRole, List<String> permissionCodes) {
    return RoleResponse.builder()
        .id(adminRole.getId())
        .roleName(adminRole.getRoleName())
        .description(adminRole.getDescription())
        .permissionCodes(permissionCodes)
        .createdAt(adminRole.getCreatedAt())
        .updatedAt(adminRole.getUpdatedAt())
        .build();
  }
}
