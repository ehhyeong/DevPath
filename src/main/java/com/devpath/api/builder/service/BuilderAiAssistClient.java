package com.devpath.api.builder.service;

import com.devpath.api.roadmap.dto.RoadmapNodeDto;
import com.devpath.common.provider.GeminiProvider;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
class BuilderAiAssistClient {

  private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
  private static final int MAX_OUTPUT_TOKENS = 2048;
  private static final int MAX_SUB_TOPICS_LENGTH = 120;

  private final GeminiProvider geminiProvider;

  JsonNode suggest(
      String question,
      String roadmapTitle,
      List<RoadmapNodeDto.Response> candidates,
      List<RoadmapNodeDto.Response> usedNodes,
      int maxModules) {
    String prompt = buildPrompt(question, roadmapTitle, candidates, usedNodes, maxModules);

    try {
      String response = geminiProvider.generateJson(prompt, responseSchema(), MAX_OUTPUT_TOKENS);

      if (response == null) {
        return null;
      }

      int start = response.indexOf('{');
      int end = response.lastIndexOf('}');

      if (start < 0 || end <= start) {
        return null;
      }

      return OBJECT_MAPPER.readTree(response.substring(start, end + 1));
    } catch (Exception e) {
      log.warn("[BuilderAiAssistClient] 빌더 AI 제안 응답 파싱 실패: {}", e.getMessage());
      return null;
    }
  }

  private String buildPrompt(
      String question,
      String roadmapTitle,
      List<RoadmapNodeDto.Response> candidates,
      List<RoadmapNodeDto.Response> usedNodes,
      int maxModules) {
    StringBuilder prompt = new StringBuilder();
    prompt.append("너는 개발자 학습 플랫폼 DevPath의 로드맵 빌더를 돕는 AI 네비게이터다.\n");
    prompt.append("학습자가 '나만의 로드맵'을 설계할 수 있도록 학습 모듈을 골라 순서대로 제안한다.\n\n");

    prompt.append("[학습자 요청]\n").append(question).append("\n\n");
    prompt.append("[현재 선택된 로드맵 템플릿]\n").append(roadmapTitle).append("\n\n");

    prompt.append("[선택 가능한 학습 모듈]\n");
    candidates.forEach(
        node ->
            prompt.append(
                String.format(
                    "- id=%d, 제목=\"%s\", 소주제=[%s]%n",
                    node.getNodeId(),
                    node.getTitle(),
                    shorten(node.getSubTopics(), MAX_SUB_TOPICS_LENGTH))));
    prompt.append("\n");

    prompt.append("[이미 캔버스에 추가된 모듈]\n");

    if (usedNodes.isEmpty()) {
      prompt.append("없음\n\n");
    } else {
      usedNodes.forEach(
          node ->
              prompt.append(String.format("- id=%d \"%s\"%n", node.getNodeId(), node.getTitle())));
      prompt.append("\n");
    }

    prompt.append("[규칙]\n");
    prompt.append("1. modules의 nodeId는 반드시 위 '선택 가능한 학습 모듈'에 있는 id만 사용하라. 새로운 모듈을 지어내지 마라.\n");
    prompt.append("2. 이미 캔버스에 추가된 모듈은 다시 추천하지 마라.\n");
    prompt.append("3. 학습 선후관계를 고려해 먼저 배워야 할 모듈이 앞에 오도록 순서대로 나열하라.\n");
    prompt.append(String.format("4. 모듈은 최대 %d개까지만 추천하라.%n", maxModules));
    prompt.append("5. 학습자 요청이 현재 템플릿과 맞지 않거나 학습과 무관하면 modules를 빈 배열로 두고, ");
    prompt.append("answer에 어떤 로드맵 템플릿을 고르면 좋을지 안내하라. 억지로 모듈을 채우지 마라.\n");
    prompt.append("6. answer는 한국어 존댓말 2~3문장이다. 모듈 제목을 나열하지 말고 왜 이렇게 구성했는지 설명하라.\n\n");

    prompt.append("아래 JSON 스키마로만 응답하라.\n");
    prompt.append("{\"answer\":\"문장\",\"modules\":[{\"nodeId\":숫자,\"reason\":\"한 문장 사유\"}]}");
    return prompt.toString();
  }

  private Map<String, Object> responseSchema() {
    Map<String, Object> stringType = Map.of("type", "string");
    Map<String, Object> moduleItem =
        Map.of(
            "type",
            "object",
            "properties",
            Map.of("nodeId", Map.of("type", "integer"), "reason", stringType));
    return Map.of(
        "type",
        "object",
        "properties",
        Map.of("answer", stringType, "modules", Map.of("type", "array", "items", moduleItem)));
  }

  private String shorten(String value, int maxLength) {
    if (value == null || value.isBlank()) {
      return "";
    }

    String normalized = value.trim().replaceAll("\\s+", " ");
    return normalized.length() <= maxLength ? normalized : normalized.substring(0, maxLength);
  }
}