package com.devpath.api.admin.repository;

import com.devpath.api.admin.entity.AdminPermission;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AdminPermissionRepository extends JpaRepository<AdminPermission, Long> {

  List<AdminPermission> findByAdminRoleIdAndIsDeletedFalse(Long adminRoleId);
}
