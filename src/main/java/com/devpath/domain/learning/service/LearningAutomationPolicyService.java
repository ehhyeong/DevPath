package com.devpath.domain.learning.service;

import com.devpath.domain.learning.entity.automation.AutomationRuleStatus;
import com.devpath.domain.learning.repository.automation.LearningAutomationRuleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LearningAutomationPolicyService {

  private final LearningAutomationRuleRepository learningAutomationRuleRepository;

  public boolean isEnabled(String ruleKey, boolean defaultValue) {
    return learningAutomationRuleRepository
        .findTopByRuleKeyOrderByPriorityDescIdDesc(ruleKey)
        .map(
            rule ->
                rule.getStatus() == AutomationRuleStatus.ENABLED
                    && (!LearningAutomationRuleCatalog.isBooleanRule(ruleKey)
                        || Boolean.parseBoolean(rule.getRuleValue())))
        .orElse(defaultValue);
  }

  public String getValue(String ruleKey, String defaultValue) {
    return learningAutomationRuleRepository
        .findTopByRuleKeyOrderByPriorityDescIdDesc(ruleKey)
        .filter(rule -> rule.getStatus() == AutomationRuleStatus.ENABLED)
        .map(rule -> rule.getRuleValue())
        .filter(value -> value != null && !value.isBlank())
        .orElse(defaultValue);
  }

  public double getTagMatchThreshold() {
    try {
      return Double.parseDouble(
          getValue(LearningAutomationRuleCatalog.TAG_MATCH_THRESHOLD, "0.80"));
    } catch (NumberFormatException exception) {
      return 0.80;
    }
  }
}
