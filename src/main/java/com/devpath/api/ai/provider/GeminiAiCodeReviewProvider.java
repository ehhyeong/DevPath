package com.devpath.api.ai.provider;

import com.devpath.common.provider.GeminiProvider;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Slf4j
@Primary
@Component
@RequiredArgsConstructor
public class GeminiAiCodeReviewProvider implements AiCodeReviewProvider {

  private static final ObjectMapper MAPPER = new ObjectMapper();

  private final GeminiProvider geminiProvider;
  private final RuleBasedAiCodeReviewProvider fallbackProvider;

  @Override
  public String providerName() {
    return "GEMINI";
  }

  @Override
  public ReviewResult review(String diffText) {
    String response = geminiProvider.generate(buildPrompt(diffText));

    if (!StringUtils.hasText(response)) {
      return fallbackProvider.review(diffText);
    }

    try {
      ReviewResult parsed = parseGeminiResponse(response);
      if (parsed.findings().isEmpty()) {
        return new ReviewResult(parsed.summary(), parsed.findings());
      }
      return parsed;
    } catch (Exception e) {
      log.warn("[GeminiAiCodeReviewProvider] 응답 파싱 실패, rule-based fallback 사용: {}", e.getMessage());
      return fallbackProvider.review(diffText);
    }
  }

  private String buildPrompt(String diffText) {
    return """
        당신은 스쿼드 Pull Request를 머지하기 전에 리뷰하는 시니어 백엔드/프론트엔드 멘토입니다.
        아래 diff 또는 코드 조각을 읽고 실제 머지 전에 막아야 할 문제점과 해결책을 한국어로 작성하세요.

        기준:
        - 버그, 보안, 성능, 동시성, 예외 처리, 테스트 누락, 유지보수성 문제를 우선합니다.
        - 단순 칭찬보다 수정 가능한 문제와 구체적인 해결책을 우선합니다.
        - lineNumber는 diff 기준으로 가장 가까운 줄 번호를 숫자로 넣고, 모르면 null로 둡니다.
        - findings는 최대 5개까지만 반환합니다.
        - 반드시 아래 JSON만 반환하고, 마크다운 코드블록은 쓰지 마세요.

        {
          "summary": "전체 리뷰 요약",
          "findings": [
            {
              "category": "BUG|SECURITY|PERFORMANCE|TEST|MAINTAINABILITY|ARCHITECTURE",
              "lineNumber": 12,
              "title": "짧은 문제 제목",
              "message": "문제점 설명",
              "suggestion": "구체적인 해결책"
            }
          ]
        }

        리뷰 대상:
        %s
        """.formatted(diffText);
  }

  private ReviewResult parseGeminiResponse(String response) throws Exception {
    JsonNode root = MAPPER.readTree(extractJson(response));
    String summary =
        root.path("summary").asText("AI 시니어 멘토가 코드 변경 사항을 검토했습니다.");
    List<ReviewFinding> findings = new ArrayList<>();

    JsonNode findingNodes = root.path("findings");
    if (findingNodes.isArray()) {
      for (JsonNode node : findingNodes) {
        findings.add(
            new ReviewFinding(
                normalizeCategory(node.path("category").asText("MAINTAINABILITY")),
                node.path("lineNumber").isNumber() ? node.path("lineNumber").asInt() : null,
                node.path("title").asText("검토가 필요한 코드"),
                node.path("message").asText("코드 변경 사항을 추가로 확인해야 합니다."),
                node.path("suggestion").asText("팀 컨벤션과 테스트 기준에 맞게 수정하세요.")));
      }
    }

    return new ReviewResult(summary, findings);
  }

  private String extractJson(String response) {
    String trimmed = response.trim();
    int start = trimmed.indexOf('{');
    int end = trimmed.lastIndexOf('}');

    if (start >= 0 && end > start) {
      return trimmed.substring(start, end + 1);
    }

    return trimmed;
  }

  private String normalizeCategory(String category) {
    String normalized = category == null ? "" : category.trim().toUpperCase();
    return normalized.isBlank() ? "MAINTAINABILITY" : normalized;
  }
}
