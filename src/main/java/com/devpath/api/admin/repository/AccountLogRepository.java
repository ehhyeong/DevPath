package com.devpath.api.admin.repository;

import com.devpath.api.admin.entity.AccountLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AccountLogRepository extends JpaRepository<AccountLog, Long> {

    List<AccountLog> findByTargetUserIdOrderByProcessedAtDesc(Long targetUserId);
}