package com.devpath.api.recommendation.component;

import com.devpath.domain.learning.entity.recommendation.NodeChangeType;
import com.devpath.domain.learning.entity.recommendation.RecommendationChange;
import com.devpath.domain.learning.entity.recommendation.RecommendationChangeStatus;
import com.devpath.domain.learning.repository.recommendation.RecommendationChangeRepository;
import com.devpath.domain.roadmap.entity.CustomRoadmap;
import com.devpath.domain.roadmap.entity.CustomRoadmapNode;
import com.devpath.domain.roadmap.entity.RoadmapNode;
import com.devpath.domain.roadmap.repository.CustomRoadmapNodeRepository;
import com.devpath.domain.roadmap.repository.RoadmapNodeRepository;
import com.devpath.domain.roadmap.service.SystemDynamicRoadmapProvider;
import com.devpath.domain.user.entity.User;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

// AI 응답의 각 변경 섹션을 검증하고 로드맵 노드와 추천 변경으로 저장한다.
@Component
@RequiredArgsConstructor
public class DiagnosisRecommendationChangeApplier {

  public static final int NEW_NODE_LIMIT = 1;

  private final RoadmapNodeRepository roadmapNodeRepository;
  private final RecommendationChangeRepository recommendationChangeRepository;
  private final SystemDynamicRoadmapProvider systemDynamicRoadmapProvider;
  private final CustomRoadmapNodeRepository customRoadmapNodeRepository;

  /** 분기 노드 제안을 적용한다. 응답이 없거나 비면 폴백 제목으로 생성한다. 생성된 분기 노드 ID를 반환한다. */
  public List<Long> applyBranch(
      User user,
      RoadmapNode clearedNode,
      CustomRoadmap customRoadmap,
      List<String> candidateTags,
      boolean isLowScore,
      JsonNode branchNode) {

    if (candidateTags.isEmpty()) return List.of();

    Map<String, String> canonicalByLower =
        candidateTags.stream().collect(Collectors.toMap(String::toLowerCase, t -> t, (a, b) -> a));

    String title = clampNodeTitle(branchNode.path("title").asText(null));
    String content = branchNode.path("content").asText(null);

    List<String> validatedTags = new ArrayList<>();
    JsonNode tagsNode = branchNode.path("tags");
    if (tagsNode.isArray()) {
      for (JsonNode tagNode : tagsNode) {
        String canonical = canonicalByLower.get(tagNode.asText("").toLowerCase());
        if (canonical != null && !validatedTags.contains(canonical)) {
          validatedTags.add(canonical);
        }
      }
    }
    if (validatedTags.isEmpty()) {
      validatedTags = candidateTags.stream().limit(3).toList();
    }

    RoadmapNode generated;
    if (title != null && !title.isBlank()) {
      generated =
          roadmapNodeRepository.save(
              RoadmapNode.builder()
                  .roadmap(systemDynamicRoadmapProvider.resolve())
                  .title(title)
                  .content(content)
                  .nodeType("BRANCH")
                  .sortOrder(null)
                  .subTopics(String.join(", ", validatedTags))
                  .build());
    } else {
      String fallbackTagList = String.join(", ", candidateTags.stream().limit(3).toList());
      generated =
          roadmapNodeRepository.save(
              RoadmapNode.builder()
                  .roadmap(clearedNode.getRoadmap())
                  .title(clampNodeTitle((isLowScore ? "[복습] " : "[심화] ") + clearedNode.getTitle()))
                  .content(fallbackTagList + " 관련 학습 내용입니다.")
                  .nodeType("BRANCH")
                  .sortOrder(null)
                  .subTopics(fallbackTagList)
                  .build());
    }

    suggestBranchChange(
        user,
        generated,
        customRoadmap,
        clearedNode,
        isLowScore ? "진단 퀴즈 저득점 — 복습 학습 노드가 추천되었습니다." : "진단 퀴즈 고득점 — 심화 학습 노드가 추천되었습니다.",
        isLowScore);
    return List.of(generated.getNodeId());
  }

  // 분기 제안은 공식 복사와 빌더 로드맵 모두에서 적용할 타깃과 기준 노드를 함께 저장한다.
  private void suggestBranchChange(
      User user,
      RoadmapNode generatedNode,
      CustomRoadmap customRoadmap,
      RoadmapNode clearedNode,
      String reason,
      boolean isLowScore) {
    CustomRoadmapNode anchor = findAnchorCustomNode(customRoadmap, clearedNode.getNodeId());
    recommendationChangeRepository.save(
        RecommendationChange.builder()
            .user(user)
            .roadmapNode(generatedNode)
            .reason(reason)
            .nodeChangeType(NodeChangeType.ADD)
            .branchFromNodeId(clearedNode.getNodeId())
            .targetCustomRoadmapId(customRoadmap == null ? null : customRoadmap.getId())
            .anchorCustomNodeId(anchor == null ? null : anchor.getId())
            .branchType(isLowScore ? "REVIEW" : "ADVANCED")
            .build());
  }

  /** 삭제 제안을 적용한다. 후보 밖 지목과 중복 제안은 무시한다. */
  public void applyDeletes(
      User user, Map<Long, CustomRoadmapNode> candidateById, JsonNode deletesNode) {
    if (!deletesNode.isArray() || candidateById.isEmpty()) return;

    for (JsonNode item : deletesNode) {
      if (!item.hasNonNull("nodeId")) continue;
      Long nodeId = item.get("nodeId").asLong();
      CustomRoadmapNode target = candidateById.get(nodeId);
      if (target == null) continue;

      boolean alreadySuggested =
          recommendationChangeRepository
              .findTopByUserIdAndRoadmapNodeNodeIdAndChangeStatusOrderByCreatedAtDesc(
                  user.getId(), nodeId, RecommendationChangeStatus.SUGGESTED)
              .isPresent();
      if (alreadySuggested) continue;

      String reason = item.path("reason").asText(null);
      recommendationChangeRepository.save(
          RecommendationChange.builder()
              .user(user)
              .roadmapNode(target.getOriginalNode())
              .reason(
                  reason != null && !reason.isBlank()
                      ? reason
                      : "진단 퀴즈 고득점 — 이미 숙지한 것으로 보여 건너뛰어도 좋은 노드입니다.")
              .nodeChangeType(NodeChangeType.DELETE)
              .build());
    }
  }

  /** 순서변경 제안을 적용한다. 후보 밖 지목, 자기 참조와 중복 제안은 무시한다. */
  public void applyReorders(
      User user,
      RoadmapNode clearedNode,
      Map<Long, CustomRoadmapNode> candidateById,
      JsonNode reordersNode) {
    if (!reordersNode.isArray() || candidateById.size() < 2) return;

    for (JsonNode item : reordersNode) {
      if (!item.hasNonNull("moveNodeId")) continue;
      Long moveId = item.get("moveNodeId").asLong();
      Long afterId = item.hasNonNull("afterNodeId") ? item.get("afterNodeId").asLong() : null;

      if (!candidateById.containsKey(moveId)) continue;
      if (afterId != null
          && !candidateById.containsKey(afterId)
          && !afterId.equals(clearedNode.getNodeId())) continue;
      if (afterId != null && afterId.equals(moveId)) continue;

      boolean alreadySuggested =
          recommendationChangeRepository
              .findTopByUserIdAndRoadmapNodeNodeIdAndChangeStatusOrderByCreatedAtDesc(
                  user.getId(), moveId, RecommendationChangeStatus.SUGGESTED)
              .isPresent();
      if (alreadySuggested) continue;

      String reason = item.path("reason").asText(null);
      recommendationChangeRepository.save(
          RecommendationChange.builder()
              .user(user)
              .roadmapNode(candidateById.get(moveId).getOriginalNode())
              .reorderAfterNodeId(afterId)
              .reason(reason != null && !reason.isBlank() ? reason : "학습 순서상 더 적합한 위치로 이동을 제안합니다.")
              .nodeChangeType(NodeChangeType.REORDER)
              .build());
    }
  }

  /** 신규 노드 제안을 적용한다. 제목 중복은 건너뛴다. */
  public void applyNewNodes(
      User user,
      RoadmapNode clearedNode,
      CustomRoadmap customRoadmap,
      Map<Long, CustomRoadmapNode> nodeById,
      JsonNode newNodesNode) {
    if (customRoadmap == null || !newNodesNode.isArray() || nodeById.isEmpty()) return;

    Set<String> pendingTitles =
        recommendationChangeRepository
            .findAllByUserIdAndChangeStatusOrderByCreatedAtDesc(
                user.getId(), RecommendationChangeStatus.SUGGESTED)
            .stream()
            .map(change -> change.getRoadmapNode().getTitle())
            .collect(Collectors.toCollection(HashSet::new));

    int count = 0;
    for (JsonNode item : newNodesNode) {
      if (count >= NEW_NODE_LIMIT) break;
      String title = clampNodeTitle(item.path("title").asText(null));
      if (title == null || title.isBlank()) continue;
      if (pendingTitles.contains(title)) continue;

      Long afterId =
          item.hasNonNull("afterCustomNodeId") ? item.get("afterCustomNodeId").asLong() : null;
      CustomRoadmapNode anchor = afterId != null ? nodeById.get(afterId) : null;

      RoadmapNode created =
          roadmapNodeRepository.save(
              RoadmapNode.builder()
                  .roadmap(systemDynamicRoadmapProvider.resolve())
                  .title(title)
                  .content(item.path("content").asText(null))
                  .nodeType("USER")
                  .sortOrder(null)
                  .subTopics(item.path("subTopics").asText(null))
                  .build());

      String reason = item.path("reason").asText(null);
      recommendationChangeRepository.save(
          RecommendationChange.builder()
              .user(user)
              .roadmapNode(created)
              .branchFromNodeId(clearedNode.getNodeId())
              .targetCustomRoadmapId(customRoadmap.getId())
              .anchorCustomNodeId(anchor != null ? anchor.getId() : null)
              .reason(
                  reason != null && !reason.isBlank() ? reason : "학습 수준과 로드맵 현황에 맞춰 추가하면 좋은 노드입니다.")
              .nodeChangeType(NodeChangeType.ADD)
              .build());

      pendingTitles.add(title);
      count++;
    }
  }

  // DB 제목 제한을 넘는 AI 응답 때문에 추천 저장 전체가 실패하지 않도록 자른다.
  private static String clampNodeTitle(String title) {
    if (title == null) {
      return null;
    }
    String trimmed = title.trim();
    return trimmed.length() > 255 ? trimmed.substring(0, 255) : trimmed;
  }

  private CustomRoadmapNode findAnchorCustomNode(CustomRoadmap customRoadmap, Long originalNodeId) {
    if (customRoadmap == null || originalNodeId == null) {
      return null;
    }

    return customRoadmapNodeRepository.findAllByCustomRoadmap(customRoadmap).stream()
        .filter(node -> node.getOriginalNode() != null)
        .filter(node -> originalNodeId.equals(node.getOriginalNode().getNodeId()))
        .findFirst()
        .orElse(null);
  }
}
