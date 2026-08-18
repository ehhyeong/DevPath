package com.devpath.common.security;

import com.devpath.api.admin.repository.AdminPermissionRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.entity.UserRole;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AdminAuthorityService {

  public static final String SUPER_ADMIN_AUTHORITY = "ADMIN_SUPER";
  public static final String DASHBOARD_READ = "ADMIN_DASHBOARD_READ";
  public static final String ACCOUNT_MANAGE = "ADMIN_ACCOUNT_MANAGE";
  public static final String GOVERNANCE_MANAGE = "ADMIN_GOVERNANCE_MANAGE";
  public static final String MODERATION_RESOLVE = "ADMIN_MODERATION_RESOLVE";
  public static final String JOB_MANAGE = "ADMIN_JOB_MANAGE";
  public static final String LEARNING_MANAGE = "ADMIN_LEARNING_MANAGE";
  public static final String NOTICE_WRITE = "ADMIN_NOTICE_WRITE";
  public static final String FINANCE_MANAGE = "ADMIN_FINANCE_MANAGE";

  private static final Set<String> SUPPORTED_AUTHORITIES =
      Set.of(
          DASHBOARD_READ,
          ACCOUNT_MANAGE,
          GOVERNANCE_MANAGE,
          MODERATION_RESOLVE,
          JOB_MANAGE,
          LEARNING_MANAGE,
          NOTICE_WRITE,
          FINANCE_MANAGE);

  private final AdminPermissionRepository adminPermissionRepository;

  @Transactional(readOnly = true)
  public List<String> resolveAuthorities(User user) {
    List<String> authorities = new ArrayList<>();
    authorities.add(user.getRole().name());
    if (user.getRole() != UserRole.ROLE_ADMIN) {
      return authorities;
    }
    if (user.getAdminRoleId() == null && user.hasSuperAdminAccess()) {
      authorities.add(SUPER_ADMIN_AUTHORITY);
      return authorities;
    }
    if (user.getAdminRoleId() == null) {
      return authorities;
    }
    adminPermissionRepository.findByAdminRoleIdAndIsDeletedFalse(user.getAdminRoleId()).stream()
        .map(permission -> permission.getPermissionCode())
        .forEach(authorities::add);
    return authorities;
  }

  public static boolean isSupported(String authority) {
    return SUPPORTED_AUTHORITIES.contains(authority);
  }

  public static List<String> supportedAuthorities() {
    return SUPPORTED_AUTHORITIES.stream().sorted().toList();
  }
}
