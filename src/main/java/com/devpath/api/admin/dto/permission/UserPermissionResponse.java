package com.devpath.api.admin.dto.permission;

import com.devpath.domain.user.entity.User;
import java.util.List;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class UserPermissionResponse {

  private Long userId;
  private String email;
  private List<String> roles;
  private Long adminRoleId;
  private String adminRoleName;
  private List<String> permissionCodes;
  private Boolean superAdmin;

  public static UserPermissionResponse from(User user) {
    return from(user, null, List.of());
  }

  public static UserPermissionResponse from(
      User user, String adminRoleName, List<String> permissionCodes) {
    return UserPermissionResponse.builder()
        .userId(user.getId())
        .email(user.getEmail())
        .roles(List.of(user.getRole().name()))
        .adminRoleId(user.getAdminRoleId())
        .adminRoleName(adminRoleName)
        .permissionCodes(permissionCodes)
        .superAdmin(user.hasSuperAdminAccess())
        .build();
  }
}
