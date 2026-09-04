package com.devpath.api.recommendation.service;

import com.devpath.api.recommendation.component.DiagnosisRecommendationChangeApplier;
import com.devpath.api.recommendation.component.RecommendationCourseScoreAnalyzer;
import com.devpath.domain.learning.repository.proof.ProofCardRepository;
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
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Random;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

  private final RoadmapNodeRepository roadmapNodeRepository;
  private final UserRepository userRepository;
  private final NodeRequiredTagRepository nodeRequiredTagRepository;
  private final DiagnosisRecommendationAiClient recommendationAiClient;
  private final DiagnosisRecommendationChangeApplier changeApplier;
  private final CustomRoadmapRepository customRoadmapRepository;
  private final CustomRoadmapNodeRepository customRoadmapNodeRepository;
  private final UserTechStackRepository userTechStackRepository;
  private final ProofCardRepository proofCardRepository;
  private final RecommendationCourseScoreAnalyzer courseScoreAnalyzer;
  private final FrontendRoadmapDemoRecommender frontendRoadmapDemoRecommender;

  @Transactional
  public RecommendationResult recommendForQuiz(Long userId, Long clearedNodeId, Long roadmapId) {
    RecommendationCourseScoreAnalyzer.CourseScores courseScores =
        courseScoreAnalyzer.analyze(userId, clearedNodeId);
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
      RecommendationCourseScoreAnalyzer.CourseScores courseScores) {

    if (clearedNodeId == null) return "";

    User user = userRepository.findById(userId).orElse(null);
    if (user == null) return "";

    RoadmapNode clearedNode = roadmapNodeRepository.findById(clearedNodeId).orElse(null);
    if (clearedNode == null) return "";

    List<String> nodeTags = nodeRequiredTagRepository.findTagNamesByNodeId(clearedNodeId);
    if (nodeTags.isEmpty()) return "";

    boolean isLowScore = (double) score / 100 < REVIEW_THRESHOLD;

    // 프론트 시연 계정은 Gemini 호출을 건너뛰고 고정 데모 추천으로 대체한다.
    if (frontendRoadmapDemoRecommender.supports(user, clearedNode, nodeTags)) {
      CustomRoadmap customRoadmap = findCustomRoadmap(user.getId(), roadmapId, customRoadmapId);
      CustomRoadmapNode anchor = findAnchorCustomNode(customRoadmap, clearedNode.getNodeId());
      return frontendRoadmapDemoRecommender
          .recommend(user, clearedNode, customRoadmap, anchor, isLowScore)
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

    // 커스텀 로드맵 컨텍스트 (삭제/순서변경/신규 제안용). 빌더/공식복사 모두 지원(customRoadmapId 우선).
    CustomRoadmap customRoadmap = findCustomRoadmap(user.getId(), roadmapId, customRoadmapId);

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
                .filter(n -> !n.isRelearnGated())
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
            DiagnosisRecommendationChangeApplier.NEW_NODE_LIMIT);

    // 섹션별 독립 적용 (한 섹션이 깨져도 나머지는 저장)
    List<Long> branchIds =
        changeApplier.applyBranch(
            user,
            clearedNode,
            customRoadmap,
            branchCandidateTags,
            isLowScore,
            recommendationAiClient.section(root, "branch"));
    if (!isLowScore) {
      changeApplier.applyDeletes(
          user, deleteCandidates, recommendationAiClient.section(root, "deletes"));
    }
    changeApplier.applyReorders(
        user, clearedNode, reorderCandidates, recommendationAiClient.section(root, "reorders"));
    changeApplier.applyNewNodes(
        user,
        clearedNode,
        customRoadmap,
        newNodeById,
        recommendationAiClient.section(root, "newNodes"));

    return branchIds.stream().map(String::valueOf).collect(Collectors.joining(","));
  }

  // ── [TEST] 노드 완료 즉시 추천 테스트 ── 실 서비스 전 삭제 대상 ────────────

  /** [TEST] 진단 퀴즈 없이 강의 성취도(없으면 랜덤) 기반으로 즉시 분기 추천을 생성한다. 노드 완료 시 추천 동작 확인용 테스트 전용 메서드. */
  @Transactional
  void testRunRecommend(Long userId, Long roadmapId, Long originalNodeId, Long customRoadmapId) {
    RecommendationCourseScoreAnalyzer.CourseScores courseScores =
        courseScoreAnalyzer.analyze(userId, originalNodeId);
    int score = resolveTestRunScore(userId, originalNodeId, courseScores);

    analyzeAndRecommend(userId, originalNodeId, score, roadmapId, customRoadmapId, courseScores);
  }

  // ── 유틸 ───────────────────────────────────────────────────────────────────

  // 강의 성취도 평균을 분기 점수(0~100)로 사용한다. 강의 점수 근거가 없으면 임시로 랜덤(60~100) 폴백한다.
  private int resolveScore(RecommendationCourseScoreAnalyzer.CourseScores courseScores) {
    if (courseScores.hasData()) {
      return (int) Math.round(courseScores.average());
    }
    return 60 + RANDOM.nextInt(41);
  }

  // 테스트 트리거 점수: 프론트 시연 계정은 고정 점수, 그 외는 강의 성취도 기반.
  private int resolveTestRunScore(
      Long userId,
      Long originalNodeId,
      RecommendationCourseScoreAnalyzer.CourseScores courseScores) {
    User user = userId == null ? null : userRepository.findById(userId).orElse(null);
    RoadmapNode node =
        originalNodeId == null ? null : roadmapNodeRepository.findById(originalNodeId).orElse(null);
    List<String> tags =
        originalNodeId == null
            ? List.of()
            : nodeRequiredTagRepository.findTagNamesByNodeId(originalNodeId);

    if (frontendRoadmapDemoRecommender.supports(user, node, tags)) {
      return frontendRoadmapDemoRecommender.score();
    }

    return resolveScore(courseScores);
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

  public record RecommendationResult(int score, String recommendedNodes) {}
}
