package com.devpath.api.admin.repository;

import com.devpath.api.admin.entity.AdminRole;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AdminRoleRepository extends JpaRepository<AdminRole, Long> {

    Optional<AdminRole> findByIdAndIsDeletedFalse(Long id);

    List<AdminRole> findByIsDeletedFalse();
}