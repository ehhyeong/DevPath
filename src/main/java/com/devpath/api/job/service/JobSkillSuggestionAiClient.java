package com.devpath.api.job.service;

import com.devpath.common.provider.GeminiProvider;
import com.devpath.domain.roadmap.entity.Roadmap;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
class JobSkillSuggestionAiClient {

  private static final ObjectMapper MAPPER = new ObjectMapper();

  private final GeminiProvider geminiProvider;

  JsonNode requestJson(String prompt) {
    try {
      String raw = geminiProvider.generateJson(prompt);
      if (raw == null) {
        return null;
      }
      int start = raw.indexOf('{');
      int end = raw.lastIndexOf('}');
      if (start < 0 || end <= start) {
        return null;
      }
      return MAPPER.readTree(raw.substring(start, end + 1));
    } catch (Exception e) {
      log.warn("[JobSkillSuggestionAiClient] Gemini 응답 파싱 실패.", e);
      return null;
    }
  }

  Long pickOfficialRoadmap(String skill, List<Roadmap> officials) {
    if (officials.isEmpty()) {
      return null;
    }
    StringBuilder prompt = new StringBuilder();
    prompt
        .append("학습자가 '")
        .append(skill)
        .append("' 기술을 학습하려고 합니다.\n")
        .append("아래 공식 로드맵 목록 중 이 기술 학습에 가장 적합한 로드맵의 id를 고르세요.\n")
        .append("적합한 로드맵이 없으면 null을 반환하세요.\n\n");
    for (Roadmap roadmap : officials) {
      prompt
          .append("- id=")
          .append(roadmap.getRoadmapId())
          .append(" | ")
          .append(roadmap.getTitle());
      if (roadmap.getDescription() != null && !roadmap.getDescription().isBlank()) {
        prompt.append(" | ").append(truncate(roadmap.getDescription(), 80));
      }
      prompt.append("\n");
    }
    prompt.append("\n반드시 아래 JSON 형식으로만 응답하세요: {\"officialRoadmapId\": 숫자 또는 null}");
    JsonNode result = requestJson(prompt.toString());
    Long picked = result == null ? null : asLong(result.path("officialRoadmapId"));
    Set<Long> validIds = officials.stream().map(Roadmap::getRoadmapId).collect(Collectors.toSet());
    return picked != null && validIds.contains(picked) ? picked : null;
  }

  List<GeneratedNode> generateRoadmapNodes(String skill, List<String> activeTags) {
    String prompt =
        "학습자가 '"
            + skill
            + "' 기술을 처음부터 학습하려고 합니다.\n5~7개의 학습 노드를 입문→심화 순서로 구성하세요.\n"
            + "각 노드의 subTopics 는 아래 태그 목록에서만 2~3개를 골라 쉼표로 작성하세요.\n"
            + "사용 가능한 태그: "
            + String.join(", ", activeTags)
            + "\n반드시 아래 JSON 형식으로만 응답하세요(설명 금지):\n"
            + "{\"nodes\":[{\"title\":\"노드 제목\",\"content\":\"노드 설명 2~3문장\",\"subTopics\":\"태그1,태그2\"}]}";
    JsonNode result = requestJson(prompt);
    List<GeneratedNode> nodes = new ArrayList<>();
    if (result != null && result.path("nodes").isArray()) {
      for (JsonNode nodeJson : result.path("nodes")) {
        String title = textValue(nodeJson, "title");
        if (title == null || title.isBlank()) {
          continue;
        }
        String content = textValue(nodeJson, "content");
        String subTopics = textValue(nodeJson, "subTopics");
        nodes.add(
            new GeneratedNode(
                title,
                content == null || content.isBlank() ? skill + " 관련 학습 내용입니다." : content,
                subTopics == null || subTopics.isBlank() ? skill : subTopics));
        if (nodes.size() >= 7) {
          break;
        }
      }
    }
    return nodes;
  }

  Long asLong(JsonNode node) {
    if (node == null || node.isNull() || node.isMissingNode()) {
      return null;
    }
    if (node.isNumber()) {
      return node.asLong();
    }
    try {
      String text = node.asText("").trim();
      return text.isEmpty() || "null".equalsIgnoreCase(text) ? null : Long.parseLong(text);
    } catch (NumberFormatException e) {
      return null;
    }
  }

  String textOrNull(JsonNode root, String field) {
    return root == null ? null : textValue(root, field);
  }

  String textValue(JsonNode node, String field) {
    if (node == null) {
      return null;
    }
    JsonNode value = node.path(field);
    return value.isMissingNode() || value.isNull() ? null : value.asText(null);
  }

  private String truncate(String value, int max) {
    if (value == null) {
      return "";
    }
    return value.length() <= max ? value : value.substring(0, max) + "…";
  }

  record GeneratedNode(String title, String content, String subTopics) {}
}
