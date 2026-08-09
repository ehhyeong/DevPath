package com.devpath.api.learner.service;

import com.devpath.api.learner.component.CourseScoreAnalyzer;
import com.devpath.api.learner.dto.DiagnosisQuizDto;
import com.devpath.api.roadmap.service.SystemDynamicRoadmapProvider;
import com.devpath.domain.learning.entity.recommendation.NodeChangeType;
import com.devpath.domain.learning.entity.recommendation.RecommendationChange;
import com.devpath.domain.learning.entity.recommendation.RecommendationChangeStatus;
import com.devpath.domain.learning.repository.proof.ProofCardRepository;
import com.devpath.domain.learning.repository.recommendation.RecommendationChangeRepository;
import com.devpath.domain.roadmap.entity.CustomRoadmap;
import com.devpath.domain.roadmap.entity.CustomRoadmapNode;
import com.devpath.domain.roadmap.entity.NodeStatus;
import com.devpath.domain.roadmap.entity.RoadmapNode;
import com.devpath.domain.roadmap.repository.CustomRoadmapNodeRepository;
import com.devpath.domain.roadmap.repository.CustomRoadmapRepository;
import com.devpath.domain.roadmap.repository.NodeRequiredTagRepository;
import com.devpath.domain.roadmap.repository.RoadmapNodeRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import com.devpath.domain.user.repository.UserTechStackRepository;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Random;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DiagnosisRecommendationService {

  private static final Random RANDOM = new Random();
  private static final double REVIEW_THRESHOLD = 0.7;
  // 고득점 클리어 시 삭제 제안 후보로 검토할 후속 노드 최대 개수
  private static final int DELETE_CANDIDATE_LIMIT = 3;
  // 클리어 시 순서변경 제안 후보로 검토할 후속 노드 최대 개수
  private static final int REORDER_CANDIDATE_LIMIT = 5;
  // 클리어 시 Gemini가 제안할 신규 노드 최대 개수
  private static final int NEW_NODE_LIMIT = 1;
  // 프론트 시연 계정 전용 고정 데모 추천 폴백 (Gemini 호출 지연 회피용)
  private static final String FRONTEND_ROADMAP_DEMO_EMAIL = "kim.hakseup@devpath.com";
  private static final int FRONTEND_ROADMAP_DEMO_SCORE = 85;
  private static final long FRONTEND_ROADMAP_DEMO_FALLBACK_DELAY_MILLIS = 1800L;
  private static final String FRONTEND_ROADMAP_DEMO_ADVANCED_TITLE = "[심화] 렌더링 성능 디버깅";
  private static final String FRONTEND_ROADMAP_DEMO_REVIEW_TITLE = "[복습] 렌더링 흐름 체크포인트";
  private static final String FRONTEND_ROADMAP_DEMO_LEGACY_ADVANCED_TITLE =
      "[Advanced] Rendering Performance Debugging";
  private static final String FRONTEND_ROADMAP_DEMO_LEGACY_REVIEW_TITLE =
      "[Review] Rendering Flow Checkpoint";

  private final RoadmapNodeRepository roadmapNodeRepository;
  private final UserRepository userRepository;
  private final NodeRequiredTagRepository nodeRequiredTagRepository;
  private final RecommendationChangeRepository recommendationChangeRepository;
  private final SystemDynamicRoadmapProvider systemDynamicRoadmapProvider;
  private final DiagnosisRecommendationAiClient recommendationAiClient;
  private final CustomRoadmapRepository customRoadmapRepository;
  private final CustomRoadmapNodeRepository customRoadmapNodeRepository;
  private final UserTechStackRepository userTechStackRepository;
  private final ProofCardRepository proofCardRepository;
  private final CourseScoreAnalyzer courseScoreAnalyzer;

  @Transactional
  public RecommendationResult recommendForQuiz(
      Long userId,
      Long clearedNodeId,
      Long roadmapId,
      CourseScoreAnalyzer.CourseScores courseScores) {
    int score = resolveScore(courseScores);
    String recommendedNodes =
        analyzeAndRecommend(userId, clearedNodeId, score, roadmapId, null, courseScores);
    return new RecommendationResult(score, recommendedNodes);
  }

  // ── 핵심 분기 로직 (단일 통합 Gemini 호출) ──────────────────────────────────

  /**
   * 클리어 시 분기/삭제/순서변경/신규 노드 제안을 Gemini 단일 호출로 생성한다. 컨텍스트를 한 번에 수집해 통합 프롬프트로 요청하고, 응답은 섹션별로 독립
   * 파싱·저장하여 일부 섹션이 깨져도 나머지는 반영한다. 반환값은 생성된 분기 노드 ID 목록(콤마 구분)으로 진단 결과 저장에 사용된다.
   */
  private String analyzeAndRecommend(
      Long userId,
      Long clearedNodeId,
      int score,
      Long roadmapId,
      Long customRoadmapId,
      CourseScoreAnalyzer.CourseScores courseScores) {

    if (clearedNodeId == null) return "";

    User user = userRepository.findById(userId).orElse(null);
    if (user == null) return "";

    RoadmapNode clearedNode = roadmapNodeRepository.findById(clearedNodeId).orElse(null);
    if (clearedNode == null) return "";

    List<String> nodeTags = nodeRequiredTagRepository.findTagNamesByNodeId(clearedNodeId);
    if (nodeTags.isEmpty()) return "";

    boolean isLowScore = (double) score / 100 < REVIEW_THRESHOLD;

    // 프론트 시연 계정은 Gemini 호출을 건너뛰고 고정 데모 추천으로 대체한다.
    if (isFrontendRoadmapDemoFallback(user, clearedNode, nodeTags)) {
      return buildFrontendRoadmapDemoFallback(
              user, clearedNode, roadmapId, customRoadmapId, isLowScore)
          .stream()
          .map(String::valueOf)
          .collect(Collectors.joining(","));
    }

    // 분기 후보 태그: 복습=노드 태그 전체, 심화=이후 로드맵에서 다루지 않는 태그만
    List<String> branchCandidateTags;
    if (isLowScore) {
      branchCandidateTags = nodeTags;
    } else {
      int minSortOrder = clearedNode.getSortOrder() != null ? clearedNode.getSortOrder() : 0;
      Set<String> futureTagSet =
          new HashSet<>(
              nodeRequiredTagRepository.findFutureTagNamesByUserAndRoadmap(
                  user.getId(), roadmapId, minSortOrder));
      branchCandidateTags = nodeTags.stream().filter(tag -> !futureTagSet.contains(tag)).toList();
    }

    // 커스텀 로드맵 컨텍스트 (삭제/순서변경/신규 제안용)
    CustomRoadmap customRoadmap =
        customRoadmapRepository
            .findByUserIdAndOriginalRoadmapRoadmapId(user.getId(), roadmapId)
            .orElse(null);

    List<CustomRoadmapNode> ordered =
        customRoadmap != null
            ? customRoadmapNodeRepository.findAllByCustomRoadmapOrderByCustomSortOrderAsc(
                customRoadmap)
            : List.of();

    Integer clearedOrder =
        ordered.stream()
            .filter(
                n ->
                    n.getOriginalNode() != null
                        && n.getOriginalNode().getNodeId().equals(clearedNode.getNodeId()))
            .map(CustomRoadmapNode::getCustomSortOrder)
            .filter(Objects::nonNull)
            .findFirst()
            .orElse(null);

    long completedCount =
        ordered.stream().filter(n -> n.getStatus() == NodeStatus.COMPLETED).count();
    long proofCount = proofCardRepository.countByUserId(user.getId());
    List<String> userTags = userTechStackRepository.findTagNamesByUserId(user.getId());

    // 삭제 후보(고득점 전용): 클리어 이후의 미완료 템플릿(비분기) 노드
    Map<Long, CustomRoadmapNode> deleteCandidates =
        (!isLowScore && clearedOrder != null)
            ? ordered.stream()
                .filter(n -> n.getOriginalNode() != null)
                .filter(n -> !n.isBranch())
                .filter(n -> n.getStatus() != NodeStatus.COMPLETED)
                .filter(
                    n -> n.getCustomSortOrder() != null && n.getCustomSortOrder() > clearedOrder)
                .limit(DELETE_CANDIDATE_LIMIT)
                .collect(
                    Collectors.toMap(
                        n -> n.getOriginalNode().getNodeId(),
                        n -> n,
                        (a, b) -> a,
                        LinkedHashMap::new))
            : new LinkedHashMap<>();

    // 순서변경 후보: 클리어 이후의 미완료 노드
    Map<Long, CustomRoadmapNode> reorderCandidates =
        (clearedOrder != null)
            ? ordered.stream()
                .filter(n -> n.getOriginalNode() != null)
                .filter(n -> n.getStatus() != NodeStatus.COMPLETED)
                .filter(
                    n -> n.getCustomSortOrder() != null && n.getCustomSortOrder() > clearedOrder)
                .limit(REORDER_CANDIDATE_LIMIT)
                .collect(
                    Collectors.toMap(
                        n -> n.getOriginalNode().getNodeId(),
                        n -> n,
                        (a, b) -> a,
                        LinkedHashMap::new))
            : new LinkedHashMap<>();

    // 신규 노드 컨텍스트: 전체 노드 (customNodeId 기준)
    Map<Long, CustomRoadmapNode> newNodeById =
        ordered.stream()
            .collect(
                Collectors.toMap(
                    CustomRoadmapNode::getId, n -> n, (a, b) -> a, LinkedHashMap::new));

    JsonNode root =
        recommendationAiClient.analyze(
            clearedNode,
            score,
            isLowScore,
            courseScores,
            branchCandidateTags,
            deleteCandidates,
            reorderCandidates,
            newNodeById,
            completedCount,
            proofCount,
            userTags,
            NEW_NODE_LIMIT);

    // 섹션별 독립 적용 (한 섹션이 깨져도 나머지는 저장)
    List<Long> branchIds =
        applyBranch(
            user,
            clearedNode,
            branchCandidateTags,
            isLowScore,
            recommendationAiClient.section(root, "branch"));
    if (!isLowScore) {
      applyDeletes(user, deleteCandidates, recommendationAiClient.section(root, "deletes"));
    }
    applyReorders(
        user, clearedNode, reorderCandidates, recommendationAiClient.section(root, "reorders"));
    applyNewNodes(
        user,
        clearedNode,
        customRoadmap,
        newNodeById,
        recommendationAiClient.section(root, "newNodes"));

    return branchIds.stream().map(String::valueOf).collect(Collectors.joining(","));
  }

  // ── 섹션별 적용 (검증 + 저장) ───────────────────────────────────────────────

  /** 분기 노드 제안을 적용한다. 응답이 없거나 비면 폴백 제목으로 생성한다. 생성된 분기 노드 ID를 반환한다. */
  private List<Long> applyBranch(
      User user,
      RoadmapNode clearedNode,
      List<String> candidateTags,
      boolean isLowScore,
      JsonNode branchNode) {

    if (candidateTags.isEmpty()) return List.of();

    Map<String, String> canonicalByLower =
        candidateTags.stream().collect(Collectors.toMap(String::toLowerCase, t -> t, (a, b) -> a));

    String title = branchNode.path("title").asText(null);
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
                  .branchGroup(null)
                  .build());
    } else {
      // Fallback: 기본 제목으로 노드 생성
      String fallbackTagList = String.join(", ", candidateTags.stream().limit(3).toList());
      generated =
          roadmapNodeRepository.save(
              RoadmapNode.builder()
                  .roadmap(clearedNode.getRoadmap())
                  .title((isLowScore ? "[복습] " : "[심화] ") + clearedNode.getTitle())
                  .content(fallbackTagList + " 관련 학습 내용입니다.")
                  .nodeType("BRANCH")
                  .sortOrder(null)
                  .subTopics(fallbackTagList)
                  .branchGroup(null)
                  .build());
    }

    suggestBranchChange(
        user,
        generated,
        isLowScore ? "진단 퀴즈 저득점 — 복습 학습 노드가 추천되었습니다." : "진단 퀴즈 고득점 — 심화 학습 노드가 추천되었습니다.",
        clearedNode.getNodeId());
    return List.of(generated.getNodeId());
  }

  private void suggestBranchChange(
      User user, RoadmapNode generatedNode, String reason, Long branchFromNodeId) {
    recommendationChangeRepository.save(
        RecommendationChange.builder()
            .user(user)
            .roadmapNode(generatedNode)
            .reason(reason)
            .nodeChangeType(NodeChangeType.ADD)
            .branchFromNodeId(branchFromNodeId)
            .build());
  }

  /** 삭제 제안을 적용한다(고득점 전용). 후보 밖 지목·중복은 무시한다. */
  private void applyDeletes(
      User user, Map<Long, CustomRoadmapNode> candidateById, JsonNode deletesNode) {
    if (!deletesNode.isArray() || candidateById.isEmpty()) return;

    for (JsonNode item : deletesNode) {
      if (!item.hasNonNull("nodeId")) continue;
      Long nodeId = item.get("nodeId").asLong();
      CustomRoadmapNode target = candidateById.get(nodeId);
      if (target == null) continue; // 후보 밖 지목 무시

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

  /** 순서변경 제안을 적용한다. 후보 밖/자기참조/중복은 폐기한다. */
  private void applyReorders(
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
  private void applyNewNodes(
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
            .map(rc -> rc.getRoadmapNode().getTitle())
            .collect(Collectors.toCollection(HashSet::new));

    int count = 0;
    for (JsonNode item : newNodesNode) {
      if (count >= NEW_NODE_LIMIT) break;
      String title = item.path("title").asText(null);
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
                  .branchGroup(null)
                  .build());

      String reason = item.path("reason").asText(null);
      recommendationChangeRepository.save(
          RecommendationChange.builder()
              .user(user)
              .roadmapNode(created)
              .branchFromNodeId(clearedNode.getNodeId()) // 변경 패널 표시 스코프용
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

  // ── [TEST] 노드 완료 즉시 추천 테스트 ── 실 서비스 전 삭제 대상 ────────────

  /** [TEST] 진단 퀴즈 없이 강의 성취도(없으면 랜덤) 기반으로 즉시 분기 추천을 생성한다. 노드 완료 시 추천 동작 확인용 테스트 전용 메서드. */
  @Transactional
  public DiagnosisQuizDto.TestRunResponse testRunRecommend(
      Long userId, Long roadmapId, Long originalNodeId) {
    return testRunRecommend(userId, roadmapId, originalNodeId, null);
  }

  @Transactional
  public DiagnosisQuizDto.TestRunResponse testRunRecommend(
      Long userId, Long roadmapId, Long originalNodeId, Long customRoadmapId) {
    CourseScoreAnalyzer.CourseScores courseScores =
        courseScoreAnalyzer.analyze(userId, originalNodeId);
    int score = resolveTestRunScore(userId, originalNodeId, courseScores);

    String recommendedNodes =
        analyzeAndRecommend(
            userId, originalNodeId, score, roadmapId, customRoadmapId, courseScores);

    boolean isLowScore = (double) score / 100 < REVIEW_THRESHOLD;
    return DiagnosisQuizDto.TestRunResponse.builder()
        .score(score)
        .maxScore(100)
        .branchType(isLowScore ? "REVIEW" : "ADVANCED")
        .recommendedNodes(recommendedNodes)
        .build();
  }

  // ── 유틸 ───────────────────────────────────────────────────────────────────

  // 강의 성취도 평균을 분기 점수(0~100)로 사용한다. 강의 점수 근거가 없으면 임시로 랜덤(60~100) 폴백한다.
  private int resolveScore(CourseScoreAnalyzer.CourseScores courseScores) {
    if (courseScores.hasData()) {
      return (int) Math.round(courseScores.average());
    }
    return 60 + RANDOM.nextInt(41);
  }

  // 테스트 트리거 점수: 프론트 시연 계정은 고정 점수, 그 외는 강의 성취도 기반.
  private int resolveTestRunScore(
      Long userId, Long originalNodeId, CourseScoreAnalyzer.CourseScores courseScores) {
    User user = userId == null ? null : userRepository.findById(userId).orElse(null);
    RoadmapNode node =
        originalNodeId == null ? null : roadmapNodeRepository.findById(originalNodeId).orElse(null);
    List<String> tags =
        originalNodeId == null
            ? List.of()
            : nodeRequiredTagRepository.findTagNamesByNodeId(originalNodeId);

    if (isFrontendRoadmapDemoFallback(user, node, tags)) {
      return Math.min(100, FRONTEND_ROADMAP_DEMO_SCORE);
    }

    return resolveScore(courseScores);
  }

  private boolean isFrontendRoadmapDemoFallback(
      User user, RoadmapNode clearedNode, List<String> nodeTags) {
    if (user == null || clearedNode == null || nodeTags == null) {
      return false;
    }
    if (!FRONTEND_ROADMAP_DEMO_EMAIL.equalsIgnoreCase(user.getEmail())) {
      return false;
    }

    String title = clearedNode.getTitle() == null ? "" : clearedNode.getTitle().toLowerCase();
    return title.contains("html")
        && title.contains("css")
        && title.contains("javascript")
        && hasTagIgnoreCase(nodeTags, "HTML")
        && hasTagIgnoreCase(nodeTags, "CSS")
        && hasTagIgnoreCase(nodeTags, "JavaScript")
        && hasTagIgnoreCase(nodeTags, "Vite");
  }

  private boolean hasTagIgnoreCase(List<String> tags, String expected) {
    return tags.stream().anyMatch(tag -> expected.equalsIgnoreCase(tag.trim()));
  }

  private List<Long> buildFrontendRoadmapDemoFallback(
      User user,
      RoadmapNode clearedNode,
      Long roadmapId,
      Long customRoadmapId,
      boolean isLowScore) {
    String title =
        isLowScore ? FRONTEND_ROADMAP_DEMO_REVIEW_TITLE : FRONTEND_ROADMAP_DEMO_ADVANCED_TITLE;
    String legacyTitle =
        isLowScore
            ? FRONTEND_ROADMAP_DEMO_LEGACY_REVIEW_TITLE
            : FRONTEND_ROADMAP_DEMO_LEGACY_ADVANCED_TITLE;

    CustomRoadmap customRoadmap = findCustomRoadmap(user.getId(), roadmapId, customRoadmapId);
    Long targetCustomRoadmapId = customRoadmap == null ? null : customRoadmap.getId();

    RecommendationChange existingChange =
        findExistingFrontendRoadmapDemoChange(
            user.getId(), title, legacyTitle, targetCustomRoadmapId);
    if (existingChange != null) {
      refreshFrontendRoadmapDemoChange(existingChange, isLowScore);
      return List.of(existingChange.getRoadmapNode().getNodeId());
    }

    pauseFrontendRoadmapDemoFallback();

    RoadmapNode generated =
        roadmapNodeRepository.save(
            RoadmapNode.builder()
                .roadmap(systemDynamicRoadmapProvider.resolve())
                .title(title)
                .content(frontendRoadmapDemoContent(isLowScore))
                .nodeType("BRANCH")
                .sortOrder(null)
                .subTopics(frontendRoadmapDemoSubTopics(isLowScore))
                .branchGroup(null)
                .build());

    CustomRoadmapNode anchor = findAnchorCustomNode(customRoadmap, clearedNode.getNodeId());

    recommendationChangeRepository.save(
        RecommendationChange.builder()
            .user(user)
            .roadmapNode(generated)
            .branchFromNodeId(clearedNode.getNodeId())
            .targetCustomRoadmapId(targetCustomRoadmapId)
            .anchorCustomNodeId(anchor == null ? null : anchor.getId())
            .branchType(isLowScore ? "REVIEW" : "ADVANCED")
            .reason(frontendRoadmapDemoReason(isLowScore))
            .contextSummary(frontendRoadmapDemoContextSummary())
            .nodeChangeType(NodeChangeType.ADD)
            .build());

    return List.of(generated.getNodeId());
  }

  private RecommendationChange findExistingFrontendRoadmapDemoChange(
      Long userId, String title, String legacyTitle, Long targetCustomRoadmapId) {
    List<RecommendationChange> changes =
        recommendationChangeRepository.findAllByUserIdAndChangeStatusOrderByCreatedAtDesc(
            userId, RecommendationChangeStatus.SUGGESTED);

    return changes.stream()
        .filter(change -> change.getRoadmapNode() != null)
        .filter(change -> Objects.equals(change.getTargetCustomRoadmapId(), targetCustomRoadmapId))
        .filter(
            change ->
                title.equals(change.getRoadmapNode().getTitle())
                    || legacyTitle.equals(change.getRoadmapNode().getTitle()))
        .findFirst()
        .orElse(null);
  }

  private void refreshFrontendRoadmapDemoChange(RecommendationChange change, boolean isLowScore) {
    RoadmapNode node = change.getRoadmapNode();
    if (node != null) {
      node.updateAdminInfo(
          isLowScore ? FRONTEND_ROADMAP_DEMO_REVIEW_TITLE : FRONTEND_ROADMAP_DEMO_ADVANCED_TITLE,
          frontendRoadmapDemoContent(isLowScore),
          "BRANCH",
          null,
          frontendRoadmapDemoSubTopics(isLowScore),
          null);
    }
    change.updateSuggestionText(
        frontendRoadmapDemoReason(isLowScore), frontendRoadmapDemoContextSummary());
  }

  private CustomRoadmap findCustomRoadmap(Long userId, Long roadmapId, Long customRoadmapId) {
    if (customRoadmapId != null) {
      CustomRoadmap directCustomRoadmap =
          customRoadmapRepository.findById(customRoadmapId).orElse(null);
      if (directCustomRoadmap != null && directCustomRoadmap.getUser().getId().equals(userId)) {
        return directCustomRoadmap;
      }
    }

    if (roadmapId == null) {
      return null;
    }

    return customRoadmapRepository
        .findByUserIdAndOriginalRoadmapRoadmapId(userId, roadmapId)
        .orElse(null);
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

  private void pauseFrontendRoadmapDemoFallback() {
    try {
      Thread.sleep(FRONTEND_ROADMAP_DEMO_FALLBACK_DELAY_MILLIS);
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      log.warn(
          "[DiagnosisRecommendationService] Frontend roadmap demo fallback delay interrupted.");
    }
  }

  private String frontendRoadmapDemoContent(boolean isLowScore) {
    if (isLowScore) {
      return "브라우저 렌더링 흐름에서 DOM, CSSOM, 렌더 트리, 레이아웃, 페인트가 어떻게 이어지는지 다시 점검합니다. 첫 Vite 페이지를 DevTools와 함께 다시 구현하면서 JavaScript DOM 변경이 어떤 화면 갱신을 만드는지 설명해 봅니다.";
    }

    return "DOM 업데이트, 스타일 재계산, 레이아웃, 페인트 비용을 연결해서 렌더링 성능을 더 깊게 다룹니다. 작은 Vite 인터랙션을 기준으로 불필요한 DOM 쓰기를 줄이기 전후를 DevTools로 비교합니다.";
  }

  private String frontendRoadmapDemoSubTopics(boolean isLowScore) {
    return isLowScore ? "DOM,CSSOM,렌더 트리,레이아웃,페인트,Vite" : "DOM,CSSOM,렌더 트리,레이아웃,페인트,DevTools,Vite";
  }

  private String frontendRoadmapDemoReason(boolean isLowScore) {
    if (isLowScore) {
      return "첫 프론트엔드 렌더링 노드에서 보완이 필요한 흐름을 다시 확인하도록 생성된 복습 추천입니다.";
    }

    return "첫 프론트엔드 렌더링 노드를 안정적으로 완료했기 때문에 렌더링 성능까지 확장하도록 생성된 심화 추천입니다.";
  }

  private String frontendRoadmapDemoContextSummary() {
    return "첫 번째 렌더링 학습 결과를 바탕으로 다음 학습 단계가 추천되었습니다.";
  }

  public record RecommendationResult(int score, String recommendedNodes) {}
}
