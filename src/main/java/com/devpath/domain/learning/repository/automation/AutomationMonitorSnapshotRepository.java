package com.devpath.domain.learning.repository.automation;

import com.devpath.domain.learning.entity.automation.AutomationMonitorSnapshot;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

// 자동화 모니터링 스냅샷 저장소다.
public interface AutomationMonitorSnapshotRepository extends JpaRepository<AutomationMonitorSnapshot, Long> {

    // 최신 스냅샷 목록을 조회한다.
    List<AutomationMonitorSnapshot> findTop20ByOrderByMeasuredAtDescIdDesc();

    // 특정 모니터 키의 최신 스냅샷을 조회한다.
    Optional<AutomationMonitorSnapshot> findTopByMonitorKeyOrderByMeasuredAtDescIdDesc(String monitorKey);
}
