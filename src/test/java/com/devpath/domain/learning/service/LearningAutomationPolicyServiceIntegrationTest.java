package com.devpath.domain.learning.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.devpath.common.exception.CustomException;
import com.devpath.domain.learning.entity.automation.AutomationRuleStatus;
import com.devpath.domain.learning.entity.automation.LearningAutomationRule;
import com.devpath.domain.learning.repository.automation.LearningAutomationRuleRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;

@DataJpaTest(
    properties = {
      "spring.jpa.hibernate.ddl-auto=create-drop",
      "spring.sql.init.mode=never",
      "spring.jpa.defer-datasource-initialization=false"
    })
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.ANY)
@Import(LearningAutomationPolicyService.class)
class LearningAutomationPolicyServiceIntegrationTest {

  @Autowired private LearningAutomationRuleRepository ruleRepository;
  @Autowired private LearningAutomationPolicyService policyService;

  @Test
  void booleanRuleRequiresEnabledStatusAndTrueValue() {
    ruleRepository.save(
        rule(
            LearningAutomationRuleCatalog.TAG_AUTO_CLASSIFICATION_ENABLED,
            "false",
            AutomationRuleStatus.ENABLED));

    assertThat(
            policyService.isEnabled(
                LearningAutomationRuleCatalog.TAG_AUTO_CLASSIFICATION_ENABLED, true))
        .isFalse();
  }

  @Test
  void readsSeedCompatibleThresholdAndPriorityValues() {
    ruleRepository.save(
        rule(
            LearningAutomationRuleCatalog.TAG_MATCH_THRESHOLD,
            "0.85",
            AutomationRuleStatus.ENABLED));
    ruleRepository.save(
        rule(
            LearningAutomationRuleCatalog.SUPPLEMENT_RECOMMENDATION_PRIORITY,
            "MISSING_TAG_COUNT_DESC",
            AutomationRuleStatus.ENABLED));

    assertThat(policyService.getTagMatchThreshold()).isEqualTo(0.85);
    assertThat(
            policyService.getValue(
                LearningAutomationRuleCatalog.SUPPLEMENT_RECOMMENDATION_PRIORITY, "fallback"))
        .isEqualTo("MISSING_TAG_COUNT_DESC");
  }

  @Test
  void rejectsUnknownKeyAndInvalidSeedValueFormats() {
    assertThatThrownBy(() -> LearningAutomationRuleCatalog.validate("UNKNOWN_RULE", "true"))
        .isInstanceOf(CustomException.class);
    assertThatThrownBy(
            () ->
                LearningAutomationRuleCatalog.validate(
                    LearningAutomationRuleCatalog.NODE_CLEARANCE_AUTO_JUDGE, "true"))
        .isInstanceOf(CustomException.class);
    assertThatThrownBy(
            () ->
                LearningAutomationRuleCatalog.validate(
                    LearningAutomationRuleCatalog.TAG_MATCH_THRESHOLD, "1.01"))
        .isInstanceOf(CustomException.class);
  }

  private LearningAutomationRule rule(String key, String value, AutomationRuleStatus status) {
    return LearningAutomationRule.builder()
        .ruleKey(key)
        .ruleName(key)
        .ruleValue(value)
        .priority(100)
        .status(status)
        .build();
  }
}
