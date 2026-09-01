package com.devpath.domain.admin.repository;

import com.devpath.domain.admin.entity.AdminPermission;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AdminPermissionRepository extends JpaRepository<AdminPermission, Long> {

  List<AdminPermission> findByAdminRoleIdAndIsDeletedFalse(Long adminRoleId);
}
