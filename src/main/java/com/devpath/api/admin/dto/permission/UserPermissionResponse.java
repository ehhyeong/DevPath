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

  public static UserPermissionResponse from(User user) {
    return UserPermissionResponse.builder()
        .userId(user.getId())
        .email(user.getEmail())
        .roles(List.of(user.getRole().name()))
        .build();
  }
}
