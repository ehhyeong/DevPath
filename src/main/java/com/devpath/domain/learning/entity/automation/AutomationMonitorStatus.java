package com.devpath.domain.learning.entity.automation;

// 자동화 모니터 상태를 나타낸다.
public enum AutomationMonitorStatus {

    // 정상 상태다.
    HEALTHY,

    // 경고 상태다.
    WARNING,

    // 치명 상태다.
    CRITICAL
}
