package com.devpath.api.builder.service;

import com.devpath.api.builder.dto.BuilderAiAssistRequest;
import com.devpath.api.builder.dto.BuilderAiAssistResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.roadmap.entity.RoadmapNode;
import com.devpath.domain.roadmap.repository.RoadmapNodeRepository;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
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

  private static final int MAX_STEPS = 8;
  private static final int MAX_BRANCHES = 4;
  private static final int MAX_LANES_PER_STEP = 2;

  private final RoadmapNodeRepository roadmapNodeRepository;
  private final BuilderAiAssistClient builderAiAssistClient;

  public BuilderAiAssistResponse suggest(BuilderAiAssistRequest request) {
    List<Long> usedNodeIds = nonNullIds(request.getUsedNodeIds());
    Set<Long> usedNodeIdSet = new HashSet<>(usedNodeIds);
    Set<Long> anchorableNodeIds = new HashSet<>(nonNullIds(request.getAnchorableNodeIds()));
    anchorableNodeIds.retainAll(usedNodeIdSet);

    // 템플릿과 무관하게 모든 공식 로드맵의 구조 노드를 후보로 삼는다(branchKind 없는 노드는 강의 활동 노드).
    List<RoadmapNode> allNodes =
        roadmapNodeRepository.findAllOfficialPublicNodes().stream()
            .filter(node -> node.getBranchKind() != null)
            .toList();

    Map<Long, RoadmapNode> nodeById = new LinkedHashMap<>();
    allNodes.forEach(node -> nodeById.put(node.getNodeId(), node));

    List<RoadmapNode> usedNodes =
        usedNodeIds.stream().map(nodeById::get).filter(Objects::nonNull).toList();
    Set<String> usedTitles = new HashSet<>();
    usedNodes.forEach(node -> usedTitles.add(normalizeTitle(node.getTitle())));

    // 캔버스에 이미 있는 노드와, 다른 템플릿의 같은 제목 노드는 후보에서 뺀다.
    Map<Long, RoadmapNode> candidateById = new LinkedHashMap<>();
    allNodes.stream()
        .filter(node -> !usedNodeIdSet.contains(node.getNodeId()))
        .filter(node -> !usedTitles.contains(normalizeTitle(node.getTitle())))
        .forEach(node -> candidateById.put(node.getNodeId(), node));

    if (candidateById.isEmpty()) {
      return BuilderAiAssistResponse.builder()
          .answer("추천할 수 있는 모듈을 모두 추가하셨습니다.")
          .steps(List.of())
          .branches(List.of())
          .build();
    }

    String currentRoadmapTitle =
        request.getRoadmapId() == null
            ? null
            : allNodes.stream()
                .map(RoadmapNode::getRoadmap)
                .filter(roadmap -> request.getRoadmapId().equals(roadmap.getRoadmapId()))
                .map(roadmap -> roadmap.getTitle())
                .findFirst()
                .orElse(null);

    JsonNode root =
        builderAiAssistClient.suggest(
            request.getQuestion(),
            currentRoadmapTitle,
            List.copyOf(candidateById.values()),
            usedNodes,
            anchorableNodeIds,
            MAX_STEPS,
            MAX_BRANCHES);

    if (root == null) {
      throw new CustomException(ErrorCode.BUILDER_AI_ASSIST_FAILED);
    }

    String answer = root.path("answer").asText("").trim();

    if (answer.isBlank()) {
      log.warn("[BuilderAiAssistService] AI 응답에 answer가 비어 있습니다.");
      throw new CustomException(ErrorCode.BUILDER_AI_ASSIST_FAILED);
    }

    // 분기·단계를 통틀어 같은 노드나 같은 제목이 두 번 나오지 않게 한다.
    Set<String> pickedTitles = new HashSet<>();
    List<BuilderAiAssistResponse.Branch> branches =
        toBranches(root.path("branches"), candidateById, anchorableNodeIds, pickedTitles);
    List<BuilderAiAssistResponse.Step> steps =
        toSteps(root.path("steps"), candidateById, pickedTitles);

    return BuilderAiAssistResponse.builder()
        .answer(answer)
        .steps(steps)
        .branches(branches)
        .build();
  }

  /** AI가 돌려준 분기를 검증한다. 분기 가능 노드에만, 같은 앵커는 한 번만 붙인다. */
  private List<BuilderAiAssistResponse.Branch> toBranches(
      JsonNode branchesNode,
      Map<Long, RoadmapNode> candidateById,
      Set<Long> anchorableNodeIds,
      Set<String> pickedTitles) {
    if (!branchesNode.isArray()) {
      return List.of();
    }

    List<BuilderAiAssistResponse.Branch> branches = new ArrayList<>();
    Set<Long> usedAnchors = new HashSet<>();

    for (JsonNode branchNode : branchesNode) {
      if (branches.size() >= MAX_BRANCHES) {
        break;
      }

      JsonNode anchorNode = branchNode.path("anchorNodeId");

      if (!anchorNode.isNumber()) {
        continue;
      }

      Long anchorNodeId = anchorNode.asLong();

      if (!anchorableNodeIds.contains(anchorNodeId) || usedAnchors.contains(anchorNodeId)) {
        continue;
      }

      BuilderAiAssistResponse.Module module =
          toModule(branchNode.path("nodeId"), branchNode.path("reason"), candidateById, pickedTitles);

      if (module == null) {
        continue;
      }

      usedAnchors.add(anchorNodeId);
      branches.add(BuilderAiAssistResponse.Branch.of(anchorNodeId, module));
    }

    return branches;
  }

  /** AI가 돌려준 단계를 검증한다. 유효한 모듈이 하나도 없는 단계는 버리고, 갈래는 최대 2개까지만 둔다. */
  private List<BuilderAiAssistResponse.Step> toSteps(
      JsonNode stepsNode, Map<Long, RoadmapNode> candidateById, Set<String> pickedTitles) {
    if (!stepsNode.isArray()) {
      return List.of();
    }

    List<BuilderAiAssistResponse.Step> steps = new ArrayList<>();

    for (JsonNode stepNode : stepsNode) {
      if (steps.size() >= MAX_STEPS) {
        break;
      }

      JsonNode modulesNode = stepNode.path("modules");

      if (!modulesNode.isArray()) {
        continue;
      }

      List<BuilderAiAssistResponse.Module> modules = new ArrayList<>();

      for (JsonNode moduleNode : modulesNode) {
        if (modules.size() >= MAX_LANES_PER_STEP) {
          break;
        }

        BuilderAiAssistResponse.Module module =
            toModule(moduleNode.path("nodeId"), moduleNode.path("reason"), candidateById, pickedTitles);

        if (module != null) {
          modules.add(module);
        }
      }

      if (!modules.isEmpty()) {
        steps.add(BuilderAiAssistResponse.Step.of(modules));
      }
    }

    return steps;
  }

  /** 후보에 없는 id와 이미 고른 제목은 버리고, 노드 정보는 서버 데이터로 채운다. */
  private BuilderAiAssistResponse.Module toModule(
      JsonNode nodeIdNode,
      JsonNode reasonNode,
      Map<Long, RoadmapNode> candidateById,
      Set<String> pickedTitles) {
    if (!nodeIdNode.isNumber()) {
      return null;
    }

    RoadmapNode candidate = candidateById.get(nodeIdNode.asLong());

    if (candidate == null || !pickedTitles.add(normalizeTitle(candidate.getTitle()))) {
      return null;
    }

    return BuilderAiAssistResponse.Module.builder()
        .nodeId(candidate.getNodeId())
        .roadmapId(candidate.getRoadmap().getRoadmapId())
        .roadmapTitle(candidate.getRoadmap().getTitle())
        .title(candidate.getTitle())
        .subTopics(candidate.getSubTopics())
        .nodeType(candidate.getNodeType())
        .reason(reasonNode.asText("").trim())
        .build();
  }

  private List<Long> nonNullIds(List<Long> ids) {
    if (ids == null) {
      return List.of();
    }

    return new ArrayList<>(new LinkedHashSet<>(ids.stream().filter(Objects::nonNull).toList()));
  }

  private String normalizeTitle(String title) {
    return title == null ? "" : title.trim().replaceAll("\\s+", " ").toLowerCase();
  }
}