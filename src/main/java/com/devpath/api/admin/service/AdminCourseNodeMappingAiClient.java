package com.devpath.api.admin.service;

import com.devpath.api.admin.dto.PolicyGovernanceResponses.CourseMappingCandidateItem;
import com.devpath.api.admin.dto.PolicyGovernanceResponses.NodeCandidateItem;
import com.devpath.common.provider.GeminiProvider;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
class AdminCourseNodeMappingAiClient {

  private static final int MAX_CANDIDATES = 12;
  private static final int MAX_RECOMMENDATIONS = 5;
  private static final ObjectMapper MAPPER = new ObjectMapper();

  private final GeminiProvider geminiProvider;

  List<Long> recommend(CourseMappingCandidateItem course) {
    List<NodeCandidateItem> candidates =
        course.getCandidates().stream().limit(MAX_CANDIDATES).toList();
    if (candidates.isEmpty()) {
      return List.of();
    }

    StringBuilder prompt = new StringBuilder();
    prompt
        .append("관리자가 강의를 학습 로드맵 노드에 연결하려고 합니다.\n")
        .append("강의 제목: ")
        .append(course.getCourseTitle())
        .append("\n강의 태그: ")
        .append(String.join(", ", course.getCourseTags()))
        .append("\n아래 후보 중 학습 내용이 직접 일치하는 노드를 최대 5개 선택하세요. 과도한 연결은 피하세요.\n");

    for (NodeCandidateItem candidate : candidates) {
      prompt
          .append("- nodeId=")
          .append(candidate.getNodeId())
          .append(" | ")
          .append(candidate.getRoadmapTitle())
          .append(" > ")
          .append(candidate.getNodeTitle())
          .append(" | requiredTags=")
          .append(String.join(", ", candidate.getRequiredTags()))
          .append(" | coverage=")
          .append(candidate.getCoveragePercent())
          .append("%\n");
    }
    prompt.append("반드시 {\"nodeIds\":[숫자]} 형식의 JSON만 반환하세요.");

    try {
      String raw = geminiProvider.generateJson(prompt.toString());
      if (raw == null || raw.isBlank()) {
        return List.of();
      }
      JsonNode nodeIds = MAPPER.readTree(raw).path("nodeIds");
      if (!nodeIds.isArray()) {
        return List.of();
      }

      Set<Long> validIds =
          candidates.stream()
              .map(NodeCandidateItem::getNodeId)
              .collect(java.util.stream.Collectors.toSet());
      LinkedHashSet<Long> selected = new LinkedHashSet<>();
      for (JsonNode nodeId : nodeIds) {
        if (nodeId.canConvertToLong() && validIds.contains(nodeId.asLong())) {
          selected.add(nodeId.asLong());
        }
        if (selected.size() >= MAX_RECOMMENDATIONS) {
          break;
        }
      }
      return selected.stream().toList();
    } catch (Exception exception) {
      // AI 응답 실패는 관리자 화면 전체 실패로 전파하지 않고 태그 추천 폴백으로 처리한다.
      log.warn("[AdminCourseNodeMappingAiClient] AI 매핑 응답을 해석하지 못했습니다.", exception);
      return List.of();
    }
  }
}
