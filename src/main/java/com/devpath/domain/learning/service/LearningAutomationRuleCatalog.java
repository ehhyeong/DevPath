package com.devpath.domain.learning.service;

import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import java.math.BigDecimal;
import java.util.Set;

public final class LearningAutomationRuleCatalog {

  public static final String TAG_MATCH_THRESHOLD = "TAG_MATCH_THRESHOLD";
  public static final String NODE_CLEARANCE_REQUIRES_COMPLETION =
      "NODE_CLEARANCE_REQUIRES_COMPLETION";
  public static final String SUPPLEMENT_RECOMMENDATION_PRIORITY =
      "SUPPLEMENT_RECOMMENDATION_PRIORITY";
  public static final String TAG_AUTO_CLASSIFICATION_ENABLED = "TAG_AUTO_CLASSIFICATION_ENABLED";
  public static final String NODE_CLEARANCE_AUTO_JUDGE = "NODE_CLEARANCE_AUTO_JUDGE";
  public static final String SUPPLEMENT_RECOMMENDATION_ENABLED =
      "SUPPLEMENT_RECOMMENDATION_ENABLED";
  public static final String PROOF_CARD_AUTO_ISSUE = "PROOF_CARD_AUTO_ISSUE";
  public static final String PROOF_CARD_MANUAL_ISSUE = "PROOF_CARD_MANUAL_ISSUE";
  public static final String RECOMMENDATION_CHANGE_ENABLED = "RECOMMENDATION_CHANGE_ENABLED";
  public static final String RECOMMENDATION_CHANGE_MAX_LIMIT = "RECOMMENDATION_CHANGE_MAX_LIMIT";

  private static final Set<String> BOOLEAN_RULES =
      Set.of(
          TAG_AUTO_CLASSIFICATION_ENABLED,
          SUPPLEMENT_RECOMMENDATION_ENABLED,
          PROOF_CARD_MANUAL_ISSUE,
          RECOMMENDATION_CHANGE_ENABLED);
  private static final Set<String> SUPPORTED_RULES =
      Set.of(
          TAG_MATCH_THRESHOLD,
          NODE_CLEARANCE_REQUIRES_COMPLETION,
          SUPPLEMENT_RECOMMENDATION_PRIORITY,
          TAG_AUTO_CLASSIFICATION_ENABLED,
          NODE_CLEARANCE_AUTO_JUDGE,
          SUPPLEMENT_RECOMMENDATION_ENABLED,
          PROOF_CARD_AUTO_ISSUE,
          PROOF_CARD_MANUAL_ISSUE,
          RECOMMENDATION_CHANGE_ENABLED,
          RECOMMENDATION_CHANGE_MAX_LIMIT);

  private LearningAutomationRuleCatalog() {}

  public static void validate(String ruleKey, String ruleValue) {
    if (!SUPPORTED_RULES.contains(ruleKey)) {
      throw new CustomException(ErrorCode.INVALID_INPUT, "지원하지 않는 학습 자동화 규칙 코드입니다.");
    }
    if (BOOLEAN_RULES.contains(ruleKey)) {
      if (!"true".equalsIgnoreCase(ruleValue) && !"false".equalsIgnoreCase(ruleValue)) {
        throw new CustomException(ErrorCode.INVALID_INPUT, "불리언 규칙 값은 true 또는 false여야 합니다.");
      }
      return;
    }

    switch (ruleKey) {
      case TAG_MATCH_THRESHOLD -> validateThreshold(ruleValue);
      case NODE_CLEARANCE_REQUIRES_COMPLETION ->
          requireValue(ruleValue, "LESSON_100_AND_EVALUATION_PASS");
      case SUPPLEMENT_RECOMMENDATION_PRIORITY -> requireValue(ruleValue, "MISSING_TAG_COUNT_DESC");
      case NODE_CLEARANCE_AUTO_JUDGE ->
          requireValue(ruleValue, "LESSON_100_AND_REQUIRED_TAGS_AND_EVALUATION_PASS");
      case PROOF_CARD_AUTO_ISSUE -> requireValue(ruleValue, "PROOF_ELIGIBLE_ONLY");
      case RECOMMENDATION_CHANGE_MAX_LIMIT -> validateLimit(ruleValue);
      default -> throw new CustomException(ErrorCode.INVALID_INPUT);
    }
  }

  public static boolean isBooleanRule(String ruleKey) {
    return BOOLEAN_RULES.contains(ruleKey);
  }

  public static Set<String> supportedRules() {
    return SUPPORTED_RULES;
  }

  private static void validateThreshold(String ruleValue) {
    try {
      BigDecimal threshold = new BigDecimal(ruleValue);
      if (threshold.compareTo(BigDecimal.ZERO) < 0 || threshold.compareTo(BigDecimal.ONE) > 0) {
        throw new NumberFormatException();
      }
    } catch (NumberFormatException exception) {
      throw new CustomException(ErrorCode.INVALID_INPUT, "태그 일치 임계값은 0 이상 1 이하의 숫자여야 합니다.");
    }
  }

  private static void validateLimit(String ruleValue) {
    try {
      int limit = Integer.parseInt(ruleValue);
      if (limit < 1 || limit > 100) {
        throw new NumberFormatException();
      }
    } catch (NumberFormatException exception) {
      throw new CustomException(ErrorCode.INVALID_INPUT, "추천 변경 최대 개수는 1 이상 100 이하여야 합니다.");
    }
  }

  private static void requireValue(String actual, String expected) {
    if (!expected.equals(actual)) {
      throw new CustomException(ErrorCode.INVALID_INPUT, "규칙 값 형식이 시드 정책과 일치하지 않습니다.");
    }
  }
}
