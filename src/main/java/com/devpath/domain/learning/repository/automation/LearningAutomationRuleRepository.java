package com.devpath.domain.learning.repository.automation;

import com.devpath.domain.learning.entity.automation.AutomationRuleStatus;
import com.devpath.domain.learning.entity.automation.LearningAutomationRule;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

// 학습 자동화 룰 저장소다.
public interface LearningAutomationRuleRepository extends JpaRepository<LearningAutomationRule, Long> {

    // 전체 룰 목록을 우선순위 기준으로 조회한다.
    List<LearningAutomationRule> findAllByOrderByPriorityDescIdDesc();

    // 특정 상태의 룰 목록을 우선순위 기준으로 조회한다.
    List<LearningAutomationRule> findAllByStatusOrderByPriorityDescIdDesc(AutomationRuleStatus status);

    // 룰 키로 단건 조회한다.
    Optional<LearningAutomationRule> findByRuleKey(String ruleKey);

    // 룰 키 기준 최신 룰을 조회한다.
    Optional<LearningAutomationRule> findTopByRuleKeyOrderByPriorityDescIdDesc(String ruleKey);
}
