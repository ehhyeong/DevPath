package com.devpath.api.dashboard.service;

import com.devpath.api.dashboard.dto.DashboardGrowthRecommendationResponse;
import com.devpath.api.dashboard.dto.DashboardGrowthRecommendationResponse.RecommendationItem;
import com.devpath.api.roadmap.service.CustomRoadmapPrerequisiteSyncService;
import com.devpath.api.roadmap.service.RoadmapProgressService;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.learning.entity.clearance.ClearanceStatus;
import com.devpath.domain.learning.entity.proof.ProofCard;
import com.devpath.domain.learning.repository.clearance.NodeClearanceRepository;
import com.devpath.domain.learning.repository.proof.ProofCardRepository;
import com.devpath.domain.learning.repository.proof.ProofCardTagRepository;
import com.devpath.domain.roadmap.entity.CustomRoadmap;
import com.devpath.domain.roadmap.entity.CustomRoadmapNode;
import com.devpath.domain.roadmap.entity.RoadmapNode;
import com.devpath.domain.roadmap.repository.CustomRoadmapNodeRepository;
import com.devpath.domain.roadmap.repository.CustomRoadmapRepository;
import com.devpath.domain.roadmap.repository.NodeRequiredTagRepository;
import com.devpath.domain.roadmap.repository.RoadmapNodeRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import com.devpath.domain.user.repository.UserTechStackRepository;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
class LearnerGrowthRecommendationService {

  private final ProofCardRepository proofCardRepository;
  private final ProofCardTagRepository proofCardTagRepository;
  private final NodeClearanceRepository nodeClearanceRepository;
  private final UserRepository userRepository;
  private final UserTechStackRepository userTechStackRepository;
  private final RoadmapNodeRepository roadmapNodeRepository;
  private final NodeRequiredTagRepository nodeRequiredTagRepository;
  private final CustomRoadmapRepository customRoadmapRepository;
  private final CustomRoadmapNodeRepository customRoadmapNodeRepository;
  private final CustomRoadmapPrerequisiteSyncService prerequisiteSyncService;
  private final RoadmapProgressService roadmapProgressService;

  DashboardGrowthRecommendationResponse getGrowthRecommendation(Long learnerId) {
    List<ProofCard> proofCards = proofCardRepository.findAllByUserIdOrderByIssuedAtDesc(learnerId);
    Set<String> learnerTags = resolveLearnerTagSet(learnerId, proofCards);

    if (learnerTags.isEmpty()) {
      return buildEmptyRecommendation();
    }

    List<RoadmapNode> officialNodes = roadmapNodeRepository.findAllOfficialPublicNodes();
    if (officialNodes.isEmpty()) {
      return buildEmptyRecommendation();
    }

    Map<Long, List<String>> requiredTagsByNodeId = loadRequiredTagsByNodeId(officialNodes);
    Set<Long> existingNodeIds =
        new LinkedHashSet<>(customRoadmapNodeRepository.findOriginalNodeIdsByUserId(learnerId));
    Set<Long> clearedNodeIds =
        nodeClearanceRepository
            .findAllByUserIdAndClearanceStatusOrderByClearedAtDesc(
                learnerId, ClearanceStatus.CLEARED)
            .stream()
            .map(clearance -> clearance.getNode().getNodeId())
            .collect(Collectors.toCollection(LinkedHashSet::new));

    List<DashboardNodeRecommendationCandidate> candidates =
        officialNodes.stream()
            .filter(node -> !existingNodeIds.contains(node.getNodeId()))
            .filter(node -> !clearedNodeIds.contains(node.getNodeId()))
            .map(node -> toDashboardCandidate(node, requiredTagsByNodeId, learnerTags))
            .sorted(dashboardRecommendationComparator())
            .limit(2)
            .toList();

    if (candidates.isEmpty()) {
      return buildEmptyRecommendation();
    }

    List<RecommendationItem> items = candidates.stream().map(this::toRecommendationItem).toList();
    return DashboardGrowthRecommendationResponse.builder()
        .analysisText(buildGrowthAnalysisText(learnerTags.size(), items.size()))
        .recommendations(items)
        .build();
  }

  @Transactional
  DashboardGrowthRecommendationResponse.AddNodeResponse addGrowthRecommendationNode(
      Long learnerId, Long nodeId) {
    User user =
        userRepository
            .findById(learnerId)
            .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
    RoadmapNode node =
        roadmapNodeRepository
            .findById(nodeId)
            .orElseThrow(() -> new CustomException(ErrorCode.ROADMAP_NODE_NOT_FOUND));

    List<CustomRoadmap> roadmaps =
        customRoadmapRepository.findAllByUserOrderByUpdatedAtDescCreatedAtDesc(user);
    boolean roadmapCreated = roadmaps.isEmpty();
    CustomRoadmap customRoadmap =
        roadmapCreated
            ? customRoadmapRepository.save(
                CustomRoadmap.builderOriginBuilder().user(user).title(node.getTitle()).build())
            : roadmaps.get(0);

    CustomRoadmapNode customNode =
        customRoadmapNodeRepository
            .findByCustomRoadmapAndOriginalNode(customRoadmap, node)
            .orElse(null);
    boolean alreadyExists = customNode != null;

    if (customNode == null) {
      customNode =
          CustomRoadmapNode.builder()
              .customRoadmap(customRoadmap)
              .originalNode(node)
              .customSortOrder(resolveNextCustomSortOrder(customRoadmap, node))
              .build();

      if (areRequiredTagsSatisfied(
          nodeRequiredTagRepository.findTagNamesByNodeId(nodeId),
          resolveLearnerTagSet(
              learnerId, proofCardRepository.findAllByUserIdOrderByIssuedAtDesc(learnerId)))) {
        customNode.complete();
      }

      customNode = customRoadmapNodeRepository.save(customNode);
      prerequisiteSyncService.ensurePrerequisites(customRoadmap);
      roadmapProgressService.updateProgressRate(
          customRoadmap, customRoadmapNodeRepository.findAllByCustomRoadmap(customRoadmap));
    }

    return DashboardGrowthRecommendationResponse.AddNodeResponse.builder()
        .customRoadmapId(customRoadmap.getId())
        .customNodeId(customNode.getId())
        .nodeId(node.getNodeId())
        .nodeTitle(node.getTitle())
        .roadmapCreated(roadmapCreated)
        .alreadyExists(alreadyExists)
        .build();
  }

  private DashboardGrowthRecommendationResponse buildEmptyRecommendation() {
    return DashboardGrowthRecommendationResponse.builder()
        .analysisText("현재 학습 데이터가 충분하지 않아 추천을 생성하지 못했습니다.")
        .recommendations(List.of())
        .build();
  }

  private Set<String> resolveLearnerTagSet(Long learnerId, List<ProofCard> proofCards) {
    Set<String> tags = new LinkedHashSet<>();

    if (!proofCards.isEmpty()) {
      List<Long> proofCardIds = proofCards.stream().map(ProofCard::getId).toList();
      proofCardTagRepository
          .findAllByProofCardIdInOrderByProofCardIdAscIdAsc(proofCardIds)
          .forEach(proofCardTag -> tags.add(proofCardTag.getTag().getName()));
    }

    tags.addAll(userTechStackRepository.findTagNamesByUserId(learnerId));
    return normalizeTagSet(tags);
  }

  private Map<Long, List<String>> loadRequiredTagsByNodeId(List<RoadmapNode> nodes) {
    List<Long> nodeIds = nodes.stream().map(RoadmapNode::getNodeId).toList();
    Map<Long, List<String>> result = new LinkedHashMap<>();
    nodeIds.forEach(nodeId -> result.put(nodeId, List.of()));

    Map<Long, List<String>> grouped =
        nodeRequiredTagRepository.findTagNamesByNodeIds(nodeIds).stream()
            .collect(
                Collectors.groupingBy(
                    NodeRequiredTagRepository.NodeRequiredTagNameProjection::getNodeId,
                    LinkedHashMap::new,
                    Collectors.mapping(
                        NodeRequiredTagRepository.NodeRequiredTagNameProjection::getTagName,
                        Collectors.toList())));

    result.putAll(grouped);
    return result;
  }

  private DashboardNodeRecommendationCandidate toDashboardCandidate(
      RoadmapNode node, Map<Long, List<String>> requiredTagsByNodeId, Set<String> learnerTags) {
    List<String> requiredTags = requiredTagsByNodeId.getOrDefault(node.getNodeId(), List.of());
    Set<String> normalizedRequiredTags = normalizeTagSet(requiredTags);
    int matchedTagCount =
        (int) normalizedRequiredTags.stream().filter(learnerTags::contains).count();
    int requiredTagCount = normalizedRequiredTags.size();
    int missingTagCount = Math.max(requiredTagCount - matchedTagCount, 0);
    double coveragePercent =
        requiredTagCount == 0 ? 50.0 : (matchedTagCount * 100.0) / requiredTagCount;
    int sortOrder = node.getSortOrder() != null ? node.getSortOrder() : 1000;
    double score =
        (matchedTagCount > 0 ? 60.0 : 0.0)
            + (coveragePercent * 0.4)
            + (Math.min(requiredTagCount, 5) * 4.0)
            - (missingTagCount * 6.0)
            - (sortOrder * 0.01);
    int growthPercent =
        Math.max(
            8,
            Math.min(
                35,
                (int)
                    Math.round(
                        8
                            + (missingTagCount * 4.0)
                            + (matchedTagCount * 3.0)
                            + (coveragePercent / 20.0))));

    return new DashboardNodeRecommendationCandidate(
        node,
        requiredTags,
        matchedTagCount,
        missingTagCount,
        coveragePercent,
        score,
        growthPercent,
        buildNodeReason(requiredTags, matchedTagCount));
  }

  private Comparator<DashboardNodeRecommendationCandidate> dashboardRecommendationComparator() {
    return Comparator.comparingDouble(DashboardNodeRecommendationCandidate::score)
        .reversed()
        .thenComparing(candidate -> candidate.node().getRoadmap().getRoadmapId())
        .thenComparing(
            candidate -> candidate.node().getSortOrder(), Comparator.nullsLast(Integer::compareTo))
        .thenComparing(candidate -> candidate.node().getNodeId());
  }

  private RecommendationItem toRecommendationItem(DashboardNodeRecommendationCandidate candidate) {
    RoadmapNode node = candidate.node();
    return RecommendationItem.builder()
        .nodeId(node.getNodeId())
        .roadmapId(node.getRoadmap().getRoadmapId())
        .nodeTitle(node.getTitle())
        .roadmapTitle(node.getRoadmap().getTitle())
        .reason(candidate.reason())
        .matchRateIncrease(candidate.growthPercent())
        .iconClass(resolveGrowthIconClass(node, candidate.requiredTags()))
        .build();
  }

  private String buildGrowthAnalysisText(int tagCount, int recommendationCount) {
    return "Proof Card와 기술 태그 "
        + tagCount
        + "개를 기준으로 추가 학습하기 좋은 로드맵 노드 "
        + recommendationCount
        + "개를 추천했습니다.";
  }

  private String buildNodeReason(List<String> requiredTags, int matchedTagCount) {
    if (requiredTags.isEmpty()) {
      return "공식 로드맵의 기초 노드라 바로 추가해서 학습을 시작할 수 있습니다.";
    }
    if (matchedTagCount == 0) {
      return "현재 보유 태그와 직접 겹치지는 않지만 다음 성장 단계로 확장하기 좋은 노드입니다.";
    }
    return "보유 태그 " + matchedTagCount + "개가 연결되어 지금 이어서 학습하기 좋은 노드입니다.";
  }

  private String resolveGrowthIconClass(RoadmapNode node, List<String> requiredTags) {
    String text = (node.getTitle() + " " + String.join(" ", requiredTags)).toLowerCase(Locale.ROOT);
    if (text.contains("sql") || text.contains("database") || text.contains("db")) {
      return "fa-database";
    }
    if (text.contains("security") || text.contains("auth")) {
      return "fa-shield-alt";
    }
    if (text.contains("spring") || text.contains("server") || text.contains("api")) {
      return "fa-server";
    }
    if (text.contains("react")
        || text.contains("next")
        || text.contains("javascript")
        || text.contains("frontend")) {
      return "fa-code";
    }
    if (text.contains("ai") || text.contains("data")) {
      return "fa-brain";
    }
    return "fa-route";
  }

  private int resolveNextCustomSortOrder(CustomRoadmap customRoadmap, RoadmapNode node) {
    return customRoadmapNodeRepository.findAllByCustomRoadmap(customRoadmap).stream()
        .map(CustomRoadmapNode::getCustomSortOrder)
        .filter(Objects::nonNull)
        .max(Integer::compareTo)
        .map(value -> value + 10)
        .orElseGet(() -> node.getSortOrder() != null ? node.getSortOrder() : 10);
  }

  private boolean areRequiredTagsSatisfied(List<String> requiredTags, Set<String> learnerTags) {
    Set<String> normalizedRequiredTags = normalizeTagSet(requiredTags);
    return !normalizedRequiredTags.isEmpty() && learnerTags.containsAll(normalizedRequiredTags);
  }

  private Set<String> normalizeTagSet(Collection<String> tags) {
    if (tags == null || tags.isEmpty()) {
      return Set.of();
    }

    return tags.stream()
        .filter(tag -> tag != null && !tag.isBlank())
        .map(tag -> tag.trim().toLowerCase(Locale.ROOT))
        .collect(Collectors.toCollection(LinkedHashSet::new));
  }

  private record DashboardNodeRecommendationCandidate(
      RoadmapNode node,
      List<String> requiredTags,
      int matchedTagCount,
      int missingTagCount,
      double coveragePercent,
      double score,
      int growthPercent,
      String reason) {}
}
