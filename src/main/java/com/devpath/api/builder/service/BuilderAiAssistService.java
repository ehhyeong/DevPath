package com.devpath.api.builder.service;

import com.devpath.api.builder.dto.BuilderAiAssistRequest;
import com.devpath.api.builder.dto.BuilderAiAssistResponse;
import com.devpath.api.roadmap.dto.RoadmapDto;
import com.devpath.api.roadmap.dto.RoadmapNodeDto;
import com.devpath.api.roadmap.service.RoadmapService;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BuilderAiAssistService {

  private static final int MAX_MODULES = 8;

  private final RoadmapService roadmapService;
  private final BuilderAiAssistClient builderAiAssistClient;

  public BuilderAiAssistResponse suggest(BuilderAiAssistRequest request) {
    RoadmapDto.DetailResponse detail =
        roadmapService.getOfficialRoadmapDetail(request.getRoadmapId());

    Set<Long> usedNodeIds = new LinkedHashSet<>();

    if (request.getUsedNodeIds() != null) {
      request.getUsedNodeIds().stream().filter(java.util.Objects::nonNull).forEach(usedNodeIds::add);
    }

    List<RoadmapNodeDto.Response> allNodes =
        detail.getNodes() == null ? List.of() : detail.getNodes();
    List<RoadmapNodeDto.Response> usedNodes =
        allNodes.stream().filter(node -> usedNodeIds.contains(node.getNodeId())).toList();

    // AI가 고를 수 있는 후보는 아직 캔버스에 올라가지 않은 노드뿐이다.
    Map<Long, RoadmapNodeDto.Response> candidateById = new LinkedHashMap<>();
    allNodes.stream()
        .filter(node -> !usedNodeIds.contains(node.getNodeId()))
        .forEach(node -> candidateById.put(node.getNodeId(), node));

    if (candidateById.isEmpty()) {
      return BuilderAiAssistResponse.builder()
          .answer("이 템플릿의 모듈을 모두 추가하셨습니다. 다른 템플릿을 선택하면 이어서 추천해 드릴 수 있습니다.")
          .modules(List.of())
          .build();
    }

    JsonNode root =
        builderAiAssistClient.suggest(
            request.getQuestion(),
            detail.getTitle(),
            List.copyOf(candidateById.values()),
            usedNodes,
            MAX_MODULES);

    if (root == null) {
      throw new CustomException(ErrorCode.BUILDER_AI_ASSIST_FAILED);
    }

    String answer = root.path("answer").asText("").trim();

    if (answer.isBlank()) {
      log.warn("[BuilderAiAssistService] AI 응답에 answer가 비어 있습니다.");
      throw new CustomException(ErrorCode.BUILDER_AI_ASSIST_FAILED);
    }

    return BuilderAiAssistResponse.builder()
        .answer(answer)
        .modules(toModules(root.path("modules"), candidateById))
        .build();
  }

  /** AI가 돌려준 nodeId를 후보 목록으로 검증한다. 후보에 없는 id와 중복은 버리고 제목은 서버 데이터로 채운다. */
  private List<BuilderAiAssistResponse.Module> toModules(
      JsonNode modulesNode, Map<Long, RoadmapNodeDto.Response> candidateById) {
    if (modulesNode == null || !modulesNode.isArray()) {
      return List.of();
    }

    List<BuilderAiAssistResponse.Module> modules = new ArrayList<>();
    Set<Long> picked = new LinkedHashSet<>();

    for (JsonNode moduleNode : modulesNode) {
      if (modules.size() >= MAX_MODULES) {
        break;
      }

      JsonNode nodeIdNode = moduleNode.path("nodeId");

      if (!nodeIdNode.isNumber()) {
        continue;
      }

      Long nodeId = nodeIdNode.asLong();
      RoadmapNodeDto.Response candidate = candidateById.get(nodeId);

      if (candidate == null || !picked.add(nodeId)) {
        continue;
      }

      modules.add(
          BuilderAiAssistResponse.Module.of(
              nodeId, candidate.getTitle(), moduleNode.path("reason").asText("").trim()));
    }

    return modules;
  }
}