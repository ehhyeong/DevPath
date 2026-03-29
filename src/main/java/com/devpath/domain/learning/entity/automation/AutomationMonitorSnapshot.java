package com.devpath.domain.learning.entity.automation;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

// 자동화 모니터링 스냅샷을 저장한다.
@Entity
@Table(name = "automation_monitor_snapshots")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AutomationMonitorSnapshot {

    // 자동화 모니터링 스냅샷 PK다.
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "automation_monitor_snapshot_id")
    private Long id;

    // 모니터 키다.
    @Column(name = "monitor_key", nullable = false, length = 100)
    private String monitorKey;

    // 모니터 상태다.
    @Enumerated(EnumType.STRING)
    @Column(name = "monitor_status", nullable = false, length = 30)
    private AutomationMonitorStatus status;

    // 스냅샷 수치다.
    @Column(name = "snapshot_value")
    private Double snapshotValue;

    // 스냅샷 메시지다.
    @Column(name = "snapshot_message", columnDefinition = "TEXT")
    private String snapshotMessage;

    // 측정 시각이다.
    @Column(name = "measured_at", nullable = false)
    private LocalDateTime measuredAt;

    // 생성 시각이다.
    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    // 자동화 모니터링 스냅샷 엔티티를 생성한다.
    @Builder
    public AutomationMonitorSnapshot(
        String monitorKey,
        AutomationMonitorStatus status,
        Double snapshotValue,
        String snapshotMessage,
        LocalDateTime measuredAt
    ) {
        this.monitorKey = monitorKey;
        this.status = status;
        this.snapshotValue = snapshotValue;
        this.snapshotMessage = snapshotMessage;
        this.measuredAt = measuredAt == null ? LocalDateTime.now() : measuredAt;
    }
}
