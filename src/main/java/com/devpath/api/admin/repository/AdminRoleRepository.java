package com.devpath.api.admin.repository;

import com.devpath.api.admin.entity.AdminRole;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AdminRoleRepository extends JpaRepository<AdminRole, Long> {

  Optional<AdminRole> findByIdAndIsDeletedFalse(Long id);

  List<AdminRole> findByIsDeletedFalse();

  boolean existsByRoleNameAndIsDeletedFalse(String roleName);

  boolean existsByRoleNameAndIsDeletedFalseAndIdNot(String roleName, Long id);
}
