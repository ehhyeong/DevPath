package com.devpath.api.builder.service;

import com.devpath.common.provider.GeminiProvider;
import com.devpath.domain.roadmap.entity.RoadmapNode;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
class BuilderAiAssistClient {

  private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
  private static final int MAX_OUTPUT_TOKENS = 4096;

  private final GeminiProvider geminiProvider;

  JsonNode suggest(
      String question,
      String currentRoadmapTitle,
      List<RoadmapNode> candidates,
      List<RoadmapNode> usedNodes,
      Set<Long> anchorableNodeIds,
      int maxSteps,
      int maxBranches) {
    String prompt =
        buildPrompt(
            question,
            currentRoadmapTitle,
            candidates,
            usedNodes,
            anchorableNodeIds,
            maxSteps,
            maxBranches);

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
      String currentRoadmapTitle,
      List<RoadmapNode> candidates,
      List<RoadmapNode> usedNodes,
      Set<Long> anchorableNodeIds,
      int maxSteps,
      int maxBranches) {
    StringBuilder prompt = new StringBuilder();
    prompt.append("너는 개발자 학습 플랫폼 DevPath의 로드맵 빌더를 돕는 AI 네비게이터다.\n");
    prompt.append("학습자가 '나만의 로드맵'을 설계할 수 있도록 여러 공식 로드맵의 학습 모듈을 골라 순서대로 제안한다.\n\n");

    prompt.append("[학습자 요청]\n").append(question).append("\n\n");

    if (currentRoadmapTitle != null) {
      prompt.append("[학습자가 지금 보고 있는 로드맵 템플릿] (참고용, 추천 범위를 제한하지 않음)\n");
      prompt.append(currentRoadmapTitle).append("\n\n");
    }

    prompt.append("[선택 가능한 학습 모듈] (로드맵별로 묶음)\n");
    Map<String, List<RoadmapNode>> candidatesByRoadmap = new LinkedHashMap<>();
    candidates.forEach(
        node ->
            candidatesByRoadmap
                .computeIfAbsent(node.getRoadmap().getTitle(), key -> new ArrayList<>())
                .add(node));
    candidatesByRoadmap.forEach(
        (roadmapTitle, nodes) -> {
          prompt.append("## ").append(roadmapTitle).append("\n");
          nodes.forEach(
              node ->
                  prompt.append(
                      String.format("- id=%d %s%n", node.getNodeId(), node.getTitle())));
        });
    prompt.append("\n");

    prompt.append("[현재 캔버스] (학습 순서대로)\n");

    if (usedNodes.isEmpty()) {
      prompt.append("비어 있음\n\n");
    } else {
      usedNodes.forEach(
          node ->
              prompt.append(
                  String.format(
                      "- id=%d %s%s%n",
                      node.getNodeId(),
                      node.getTitle(),
                      anchorableNodeIds.contains(node.getNodeId()) ? " (분기 가능)" : "")));
      prompt.append("\n");
    }

    prompt.append("[응답 구성]\n");
    prompt.append("- steps: 캔버스 끝에 이어 붙일 새 학습 단계를 학습 순서대로 나열한다. ");
    prompt.append("단계마다 modules에 1개(일반 단계) 또는 2개(갈림길: 둘 중 하나를 골라 배우는 대안)를 넣는다.\n");
    prompt.append("- branches: 현재 캔버스의 '(분기 가능)' 모듈 옆에 대안 갈래를 붙인다. ");
    prompt.append("anchorNodeId는 캔버스 모듈 id, nodeId는 붙일 학습 모듈 id다.\n\n");

    prompt.append("[규칙]\n");
    prompt.append("1. nodeId는 반드시 '선택 가능한 학습 모듈'에 있는 id만 사용하라. 새로운 모듈을 지어내지 마라.\n");
    prompt.append("2. 이미 캔버스에 있는 모듈이나 제목이 같은 모듈은 다시 추천하지 마라. 응답 안에서도 같은 모듈을 두 번 쓰지 마라.\n");
    prompt.append("3. 여러 로드맵의 모듈을 섞어도 된다. 학습자 요청에 가장 잘 맞는 모듈을 고르고, ");
    prompt.append("먼저 배워야 할 모듈이 앞에 오도록 학습 선후관계를 지켜라.\n");
    prompt.append("4. 갈림길(2개짜리 step)과 branches는 서로 대체 가능한 기술(예: React와 Vue, Spring과 Node.js)이거나 ");
    prompt.append("학습자가 선택지·대안을 원할 때만 쓴다. 2개짜리 step은 '둘 중 하나만 배워도 되는' 관계일 때만 쓴다. ");
    prompt.append("HTML과 CSS, Java와 Spring처럼 둘 다 배워야 하는 모듈은 절대 같은 step에 넣지 말고 각각 별도 step으로 둔다.\n");
    prompt.append("5. 학습자가 기존 캔버스 모듈에 대안을 붙여 달라고 하면 branches를 쓰고, ");
    prompt.append("'(분기 가능)' 표시가 없는 모듈에는 분기를 붙이지 마라. 붙일 수 없으면 answer에서 이유를 안내하라. ");
    prompt.append("분기만 요청받았으면 요청하지 않은 steps를 덧붙이지 말고 빈 배열로 둬라.\n");
    prompt.append(String.format("6. steps는 최대 %d개, branches는 최대 %d개다.%n", maxSteps, maxBranches));
    prompt.append("7. 학습자 요청이 학습과 무관하거나 맞는 모듈이 없으면 steps와 branches를 빈 배열로 두고 answer로 안내하라. ");
    prompt.append("억지로 모듈을 채우지 마라.\n");
    prompt.append("8. answer는 branches와 steps를 정한 뒤, 실제로 담은 내용만 설명하는 한국어 존댓말 2~3문장이다. ");
    prompt.append("모듈 제목을 나열하지 말고 왜 이렇게 구성했는지 설명하라.\n\n");

    prompt.append("아래 JSON 스키마로만 응답하라.\n");
    prompt.append("{\"branches\":[{\"anchorNodeId\":숫자,\"nodeId\":숫자,\"reason\":\"한 문장 사유\"}],");
    prompt.append("\"steps\":[{\"modules\":[{\"nodeId\":숫자,\"reason\":\"한 문장 사유\"}]}],");
    prompt.append("\"answer\":\"문장\"}");
    return prompt.toString();
  }

  // required가 없으면 모델이 branches를 통째로 빠뜨리기도 하고, answer를 먼저 쓰면 실제로 담지 않은
  // 분기까지 설명한다. 그래서 필드를 required로 두고 branches → steps → answer 순으로 생성하게 한다.
  private Map<String, Object> responseSchema() {
    Map<String, Object> stringType = Map.of("type", "string");
    Map<String, Object> integerType = Map.of("type", "integer");
    Map<String, Object> moduleItem =
        Map.of(
            "type",
            "object",
            "properties",
            Map.of("nodeId", integerType, "reason", stringType),
            "required",
            List.of("nodeId", "reason"));
    Map<String, Object> stepItem =
        Map.of(
            "type",
            "object",
            "properties",
            Map.of("modules", Map.of("type", "array", "items", moduleItem)),
            "required",
            List.of("modules"));
    Map<String, Object> branchItem =
        Map.of(
            "type",
            "object",
            "properties",
            Map.of("anchorNodeId", integerType, "nodeId", integerType, "reason", stringType),
            "required",
            List.of("anchorNodeId", "nodeId", "reason"));
    return Map.of(
        "type",
        "object",
        "properties",
        Map.of(
            "answer",
            stringType,
            "steps",
            Map.of("type", "array", "items", stepItem),
            "branches",
            Map.of("type", "array", "items", branchItem)),
        "required",
        List.of("branches", "steps", "answer"),
        "propertyOrdering",
        List.of("branches", "steps", "answer"));
  }
}