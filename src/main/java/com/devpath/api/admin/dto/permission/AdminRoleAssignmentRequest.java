package com.devpath.api.admin.dto.permission;

import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AdminRoleAssignmentRequest {

  @NotNull private Long roleId;
}
