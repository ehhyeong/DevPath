package com.devpath.api.ai.provider;

import java.util.List;

public interface AiCodeReviewProvider {

  // 외부 AI 또는 rule-based 엔진 이름을 반환한다.
  String providerName();

  // diffText를 분석해 리뷰 결과를 생성한다.
  ReviewResult review(String diffText);

  record ReviewResult(String summary, List<ReviewFinding> findings) {}

  record ReviewFinding(
      String category, Integer lineNumber, String title, String message, String suggestion) {}
}
