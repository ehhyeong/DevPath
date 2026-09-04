package com.devpath.api.recommendation.service;

import com.devpath.api.recommendation.component.RecommendationCourseScoreAnalyzer;
import com.devpath.common.provider.GeminiProvider;
import com.devpath.domain.roadmap.entity.CustomRoadmapNode;
import com.devpath.domain.roadmap.entity.NodeStatus;
import com.devpath.domain.roadmap.entity.RoadmapNode;
import com.devpath.domain.roadmap.repository.NodeRequiredTagRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.MissingNode;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
class DiagnosisRecommendationAiClient {

  private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
  private static final int MAX_OUTPUT_TOKENS = 8192;

  private final GeminiProvider geminiProvider;
  private final NodeRequiredTagRepository nodeRequiredTagRepository;

  JsonNode analyze(
      RoadmapNode clearedNode,
      int score,
      boolean lowScore,
      RecommendationCourseScoreAnalyzer.CourseScores courseScores,
      List<String> branchCandidateTags,
      Map<Long, CustomRoadmapNode> deleteCandidates,
      Map<Long, CustomRoadmapNode> reorderCandidates,
      Map<Long, CustomRoadmapNode> newNodeById,
      long completedCount,
      long proofCount,
      List<String> userTags,
      int newNodeLimit) {
    String prompt =
        buildPrompt(
            clearedNode,
            score,
            lowScore,
            courseScores,
            branchCandidateTags,
            deleteCandidates,
            reorderCandidates,
            newNodeById,
            completedCount,
            proofCount,
            userTags,
            newNodeLimit);
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
      log.warn("[DiagnosisRecommendationAiClient] 통합 추천 응답 파싱 실패: {}", e.getMessage());
      return null;
    }
  }

  JsonNode section(JsonNode root, String key) {
    return root == null ? MissingNode.getInstance() : root.path(key);
  }

  private String buildPrompt(
      RoadmapNode clearedNode,
      int score,
      boolean lowScore,
      RecommendationCourseScoreAnalyzer.CourseScores courseScores,
      List<String> branchCandidateTags,
      Map<Long, CustomRoadmapNode> deleteCandidates,
      Map<Long, CustomRoadmapNode> reorderCandidates,
      Map<Long, CustomRoadmapNode> newNodeById,
      long completedCount,
      long proofCount,
      List<String> userTags,
      int newNodeLimit) {
    StringBuilder prompt = new StringBuilder();
    prompt.append(
        String.format(
            "학습자가 '%s'(id=%d) 노드를 %d/100점으로 클리어했습니다.%n",
            clearedNode.getTitle(), clearedNode.getNodeId(), score));
    prompt.append(
        String.format(
            "학습자 현황: 완료 노드 %d개, 보유 인증(Proof) %d개, 보유 기술 태그 [%s].%n%n",
            completedCount, proofCount, String.join(", ", userTags)));

    if (courseScores.hasData()) {
      prompt.append("[강의별 성취도]\n");
      courseScores
          .perCourse()
          .forEach(
              courseScore ->
                  prompt.append(
                      String.format(
                          "- %s: %d점%n", courseScore.courseName(), courseScore.percent())));
      prompt.append("강의별로 강약이 다르면 점수가 낮은 강의 영역은 복습을, 높은 영역은 심화를 우선 고려해 추천하라.\n\n");
    }

    prompt.append("[분기 노드]\n");
    prompt.append(String.format("선택 가능한 태그: [%s]%n", String.join(", ", branchCandidateTags)));
    prompt.append(
        lowScore
            ? "위 태그 중 복습이 필요한 태그를 최대 3개 골라 복습 학습 노드를 생성하라.\n\n"
            : "위 태그 중 심화 학습에 가장 적합한 태그를 최대 3개 골라 심화 학습 노드를 생성하라.\n\n");

    if (!lowScore && !deleteCandidates.isEmpty()) {
      prompt.append("[삭제 제안]\n후속 노드 후보:\n");
      appendCandidateTagLines(prompt, deleteCandidates);
      prompt.append("이 중 학습자가 이미 충분히 숙지하여 건너뛰어도 되는 노드만 골라 삭제를 제안하라. 확신이 없으면 포함하지 말 것.\n\n");
    }
    if (reorderCandidates.size() >= 2) {
      prompt.append("[순서변경 제안]\n현재 순서대로 나열된 후속 노드:\n");
      appendCandidateTagLines(prompt, reorderCandidates);
      prompt.append(
          String.format(
              "학습 흐름상 순서를 바꾸는 게 더 합리적인 노드가 있으면 제안하라. moveNodeId를 afterNodeId"
                  + "(위 후보 id 또는 클리어한 노드 id=%d, 맨 앞으로 보내려면 null) 바로 뒤로 이동하는 의미다.%n%n",
              clearedNode.getNodeId()));
    }
    if (!newNodeById.isEmpty()) {
      prompt.append("[신규 노드 제안]\n현재 로드맵 노드 목록:\n");
      newNodeById.forEach(
          (id, node) -> {
            String title =
                node.getOriginalNode() != null
                    ? node.getOriginalNode().getTitle()
                    : (node.getBuilderModule() != null ? node.getBuilderModule().getTitle() : "노드");
            prompt.append(
                String.format(
                    "- customNodeId=%d, 제목=\"%s\", 완료=%b%n",
                    id, title, node.getStatus() == NodeStatus.COMPLETED));
          });
      prompt.append(
          String.format(
              "학습자 수준과 로드맵 흐름을 고려해 추가하면 좋을 신규 노드를 최대 %d개, afterCustomNodeId"
                  + "(위 목록 중 하나, 맨 앞이면 null) 위치에 제안하라. 꼭 필요하지 않으면 비워라.%n%n",
              newNodeLimit));
    }

    prompt.append("아래 JSON 스키마로만 응답하라. 제안할 내용이 없는 섹션은 빈 배열 또는 빈 값으로 두라.\n");
    prompt.append(
        "{\"branch\":{\"tags\":[\"태그\"],\"title\":\"제목\",\"content\":\"2~3문장 설명\"},"
            + "\"deletes\":[{\"nodeId\":숫자,\"reason\":\"사유\"}],"
            + "\"reorders\":[{\"moveNodeId\":숫자,\"afterNodeId\":숫자또는null,\"reason\":\"사유\"}],"
            + "\"newNodes\":[{\"title\":\"제목\",\"content\":\"설명\",\"subTopics\":\"소주제1,소주제2\","
            + "\"afterCustomNodeId\":숫자또는null,\"reason\":\"사유\"}]}");
    return prompt.toString();
  }

  private void appendCandidateTagLines(
      StringBuilder prompt, Map<Long, CustomRoadmapNode> candidateById) {
    candidateById.forEach(
        (nodeId, node) -> {
          List<String> tags = nodeRequiredTagRepository.findTagNamesByNodeId(nodeId);
          prompt.append(
              String.format(
                  "- id=%d, 제목=\"%s\", 태그=[%s]%n",
                  nodeId, node.getOriginalNode().getTitle(), String.join(", ", tags)));
        });
  }

  private Map<String, Object> responseSchema() {
    Map<String, Object> stringType = Map.of("type", "string");
    Map<String, Object> integerType = Map.of("type", "integer");
    Map<String, Object> nullableInteger = Map.of("type", "integer", "nullable", true);
    Map<String, Object> branch =
        Map.of(
            "type",
            "object",
            "properties",
            Map.of(
                "tags", Map.of("type", "array", "items", stringType),
                "title", stringType,
                "content", stringType));
    Map<String, Object> deleteItem =
        Map.of("type", "object", "properties", Map.of("nodeId", integerType, "reason", stringType));
    Map<String, Object> reorderItem =
        Map.of(
            "type",
            "object",
            "properties",
            Map.of(
                "moveNodeId", integerType,
                "afterNodeId", nullableInteger,
                "reason", stringType));
    Map<String, Object> newNodeItem =
        Map.of(
            "type",
            "object",
            "properties",
            Map.of(
                "title", stringType,
                "content", stringType,
                "subTopics", stringType,
                "afterCustomNodeId", nullableInteger,
                "reason", stringType));
    return Map.of(
        "type",
        "object",
        "properties",
        Map.of(
            "branch", branch,
            "deletes", Map.of("type", "array", "items", deleteItem),
            "reorders", Map.of("type", "array", "items", reorderItem),
            "newNodes", Map.of("type", "array", "items", newNodeItem)));
  }
}
