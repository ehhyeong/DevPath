package com.devpath.domain.admin.repository;

import com.devpath.domain.admin.entity.AccountLog;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AccountLogRepository extends JpaRepository<AccountLog, Long> {

  List<AccountLog> findByTargetUserIdOrderByProcessedAtDesc(Long targetUserId);
}
