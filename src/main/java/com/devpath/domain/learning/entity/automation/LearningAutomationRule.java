package com.devpath.domain.learning.entity.automation;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

// 학습 자동화 룰을 저장한다.
@Entity
@Table(
    name = "learning_automation_rules",
    uniqueConstraints = {
        @UniqueConstraint(
            name = "uk_learning_automation_rules_rule_key",
            columnNames = {"rule_key"}
        )
    }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class LearningAutomationRule {

    // 학습 자동화 룰 PK다.
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "learning_automation_rule_id")
    private Long id;

    // 룰 키다.
    @Column(name = "rule_key", nullable = false, length = 100)
    private String ruleKey;

    // 룰 이름이다.
    @Column(name = "rule_name", nullable = false, length = 150)
    private String ruleName;

    // 룰 설명이다.
    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    // 룰 값이다.
    @Column(name = "rule_value", length = 500)
    private String ruleValue;

    // 우선순위다.
    @Column(name = "priority", nullable = false)
    private Integer priority;

    // 룰 상태다.
    @Enumerated(EnumType.STRING)
    @Column(name = "rule_status", nullable = false, length = 30)
    private AutomationRuleStatus status;

    // 생성 시각이다.
    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    // 수정 시각이다.
    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // 학습 자동화 룰 엔티티를 생성한다.
    @Builder
    public LearningAutomationRule(
        String ruleKey,
        String ruleName,
        String description,
        String ruleValue,
        Integer priority,
        AutomationRuleStatus status
    ) {
        this.ruleKey = ruleKey;
        this.ruleName = ruleName;
        this.description = description;
        this.ruleValue = ruleValue;
        this.priority = priority == null ? 0 : priority;
        this.status = status == null ? AutomationRuleStatus.ENABLED : status;
    }

    // 룰 정보를 수정한다.
    public void update(
        String ruleKey,
        String ruleName,
        String description,
        String ruleValue,
        Integer priority
    ) {
        this.ruleKey = ruleKey;
        this.ruleName = ruleName;
        this.description = description;
        this.ruleValue = ruleValue;
        this.priority = priority == null ? 0 : priority;
    }

    // 룰을 활성화한다.
    public void enable() {
        this.status = AutomationRuleStatus.ENABLED;
    }

    // 룰을 비활성화한다.
    public void disable() {
        this.status = AutomationRuleStatus.DISABLED;
    }
}
