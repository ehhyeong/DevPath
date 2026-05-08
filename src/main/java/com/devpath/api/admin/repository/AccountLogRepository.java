package com.devpath.api.admin.repository;

import com.devpath.api.admin.entity.AccountLog;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AccountLogRepository extends JpaRepository<AccountLog, Long> {

  List<AccountLog> findByTargetUserIdOrderByProcessedAtDesc(Long targetUserId);
}
