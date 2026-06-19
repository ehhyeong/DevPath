package com.devpath.api.learner.service;

import com.devpath.api.learner.dto.DiagnosisQuizDto;
import com.devpath.api.roadmap.service.SystemDynamicRoadmapProvider;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.common.provider.GeminiProvider;
import com.devpath.domain.learning.entity.recommendation.NodeChangeType;
import com.devpath.domain.learning.entity.recommendation.RecommendationChange;
import com.devpath.domain.learning.entity.recommendation.RecommendationChangeStatus;
import com.devpath.domain.learning.repository.proof.ProofCardRepository;
import com.devpath.domain.learning.repository.recommendation.RecommendationChangeRepository;
import com.devpath.domain.roadmap.entity.CustomRoadmap;
import com.devpath.domain.roadmap.entity.CustomRoadmapNode;
import com.devpath.domain.roadmap.entity.DiagnosisQuiz;
import com.devpath.domain.roadmap.entity.DiagnosisResult;
import com.devpath.domain.roadmap.entity.NodeStatus;
import com.devpath.domain.roadmap.entity.QuizDifficulty;
import com.devpath.domain.roadmap.entity.Roadmap;
import com.devpath.domain.roadmap.entity.RoadmapNode;
import com.devpath.domain.roadmap.repository.CustomRoadmapNodeRepository;
import com.devpath.domain.roadmap.repository.CustomRoadmapRepository;
import com.devpath.domain.roadmap.repository.DiagnosisQuizRepository;
import com.devpath.domain.roadmap.repository.DiagnosisResultRepository;
import com.devpath.domain.roadmap.repository.NodeRequiredTagRepository;
import com.devpath.domain.roadmap.repository.RoadmapNodeRepository;
import com.devpath.domain.roadmap.repository.RoadmapRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import com.devpath.domain.user.repository.UserTechStackRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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
public class DiagnosisQuizService {

  private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
  private static final Random RANDOM = new Random();
  private static final double REVIEW_THRESHOLD = 0.7;
  // 고득점 클리어 시 삭제 제안 후보로 검토할 후속 노드 최대 개수
  private static final int DELETE_CANDIDATE_LIMIT = 3;
  // 클리어 시 순서변경 제안 후보로 검토할 후속 노드 최대 개수
  private static final int REORDER_CANDIDATE_LIMIT = 5;
  // 클리어 시 Gemini가 제안할 신규 노드 최대 개수
  private static final int NEW_NODE_LIMIT = 1;
  private static final String FRONTEND_ROADMAP_DEMO_EMAIL = "kim.hakseup@devpath.com";
  private static final int FRONTEND_ROADMAP_DEMO_SCORE = 85;
  private static final long FRONTEND_ROADMAP_DEMO_FALLBACK_DELAY_MILLIS = 1800L;
  private static final String FRONTEND_ROADMAP_DEMO_ADVANCED_TITLE =
      "[Advanced] Rendering Performance Debugging";
  private static final String FRONTEND_ROADMAP_DEMO_REVIEW_TITLE =
      "[Review] Rendering Flow Checkpoint";

  private final DiagnosisQuizRepository diagnosisQuizRepository;
  private final DiagnosisResultRepository diagnosisResultRepository;
  private final RoadmapRepository roadmapRepository;
  private final RoadmapNodeRepository roadmapNodeRepository;
  private final UserRepository userRepository;
  private final NodeRequiredTagRepository nodeRequiredTagRepository;
  private final RecommendationChangeRepository recommendationChangeRepository;
  private final SystemDynamicRoadmapProvider systemDynamicRoadmapProvider;
  private final GeminiProvider geminiProvider;
  private final CustomRoadmapRepository customRoadmapRepository;
  private final CustomRoadmapNodeRepository customRoadmapNodeRepository;
  private final UserTechStackRepository userTechStackRepository;
  private final ProofCardRepository proofCardRepository;

  /** 진단 퀴즈 생성 */
  @Transactional
  public DiagnosisQuizDto.QuizResponse createDiagnosisQuiz(
      Long userId, Long roadmapId, QuizDifficulty difficulty) {
    if (diagnosisQuizRepository.existsByUser_IdAndRoadmap_RoadmapId(userId, roadmapId)) {
      throw new CustomException(ErrorCode.QUIZ_ALREADY_TAKEN);
    }
    User user =
        userRepository
            .findById(userId)
            .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
    Roadmap roadmap =
        roadmapRepository
            .findById(roadmapId)
            .orElseThrow(() -> new CustomException(ErrorCode.ROADMAP_NOT_FOUND));
    DiagnosisQuiz quiz =
        DiagnosisQuiz.builder()
            .user(user)
            .roadmap(roadmap)
            .questionCount(determineQuestionCount(difficulty))
            .difficulty(difficulty)
            .build();
    return DiagnosisQuizDto.QuizResponse.from(diagnosisQuizRepository.save(quiz));
  }

  /** 진단 퀴즈 제출 — clearedNodeId: 방금 클리어한 노드의 originalNodeId */
  @Transactional
  public DiagnosisQuizDto.QuizResultResponse submitQuizAnswer(
      Long userId, Long quizId, Long clearedNodeId, Map<Integer, String> answers) {

    DiagnosisQuiz quiz =
        diagnosisQuizRepository
            .findByQuizIdAndUser_Id(quizId, userId)
            .orElseThrow(() -> new CustomException(ErrorCode.QUIZ_NOT_FOUND));
    if (quiz.getSubmittedAt() != null) {
      throw new CustomException(ErrorCode.QUIZ_ALREADY_SUBMITTED);
    }
    quiz.submit();

    int score = calculateScore(answers);
    int maxScore = quiz.getQuestionCount() * 10;

    String recommendedNodes =
        analyzeAndRecommend(
            userId, clearedNodeId, score, maxScore, quiz.getRoadmap().getRoadmapId());

    DiagnosisResult result =
        DiagnosisResult.builder()
            .user(quiz.getUser())
            .roadmap(quiz.getRoadmap())
            .quiz(quiz)
            .score(score)
            .maxScore(maxScore)
            .weakAreas("")
            .recommendedNodes(recommendedNodes)
            .build();
    return DiagnosisQuizDto.QuizResultResponse.from(diagnosisResultRepository.save(result));
  }

  /** 진단 결과 조회 */
  public DiagnosisQuizDto.QuizResultResponse getDiagnosisResult(Long userId, Long resultId) {
    DiagnosisResult result =
        diagnosisResultRepository
            .findByResultIdAndUser_Id(resultId, userId)
            .orElseThrow(() -> new CustomException(ErrorCode.RESOURCE_NOT_FOUND));
    return DiagnosisQuizDto.QuizResultResponse.from(result);
  }

  /** 최근 진단 결과 조회 */
  public DiagnosisQuizDto.QuizResultResponse getLatestDiagnosisResult(Long userId, Long roadmapId) {
    DiagnosisResult result =
        diagnosisResultRepository
            .findLatestByUserAndRoadmap(userId, roadmapId)
            .orElseThrow(() -> new CustomException(ErrorCode.RESOURCE_NOT_FOUND));
    return DiagnosisQuizDto.QuizResultResponse.from(result);
  }

  // ── 핵심 분기 로직 ─────────────────────────────────────────────────────────

  private String analyzeAndRecommend(
      Long userId, Long clearedNodeId, int score, int maxScore, Long roadmapId) {

    if (clearedNodeId == null) return "";

    User user = userRepository.findById(userId).orElse(null);
    if (user == null) return "";

    RoadmapNode clearedNode = roadmapNodeRepository.findById(clearedNodeId).orElse(null);
    if (clearedNode == null) return "";

    List<String> nodeTags = nodeRequiredTagRepository.findTagNamesByNodeId(clearedNodeId);
    if (nodeTags.isEmpty()) return "";

    boolean isLowScore = (double) score / maxScore < REVIEW_THRESHOLD;

    if (isFrontendRoadmapDemoFallback(user, clearedNode, nodeTags)) {
      return buildFrontendRoadmapDemoFallback(user, clearedNode, roadmapId, isLowScore).stream()
          .map(String::valueOf)
          .collect(Collectors.joining(","));
    }

    List<Long> recommendedNodeIds =
        isLowScore
            ? buildReviewBranch(user, clearedNode, nodeTags, roadmapId)
            : buildAdvancedBranch(user, clearedNode, nodeTags, roadmapId);

    // 고득점일 때만, 이미 숙지한 것으로 보이는 후속 노드 삭제 제안을 동시 생성한다.
    if (!isLowScore) {
      buildDeleteSuggestions(user, clearedNode, score, maxScore, roadmapId);
    }

    // 점수와 무관하게, 학습 순서상 더 합리적인 후속 노드 순서변경 제안을 동시 생성한다.
    buildReorderSuggestions(user, clearedNode, roadmapId);

    // 학습 수준 + 로드맵 전체 현황을 보고 추가하면 좋을 신규 노드를 Gemini가 적절한 위치에 삽입 제안한다.
    buildNewNodeSuggestions(user, clearedNode, score, maxScore, roadmapId);

    return recommendedNodeIds.stream().map(String::valueOf).collect(Collectors.joining(","));
  }

  /** 복습 브랜치: 낮은 점수 → Gemini가 복습 태그 선택 후 새 복습 노드 생성 */
  private List<Long> buildReviewBranch(
      User user, RoadmapNode clearedNode, List<String> nodeTags, Long roadmapId) {

    RoadmapNode generated = generateBranchNode(clearedNode, nodeTags, false);
    suggestBranchChange(user, generated, "진단 퀴즈 저득점 — 복습 학습 노드가 추천되었습니다.", clearedNode.getNodeId());
    return List.of(generated.getNodeId());
  }

  /** 심화 브랜치: 높은 점수 → 이후 로드맵에서 다루지 않는 태그만 남겨 Gemini가 새 심화 노드 생성 */
  private List<Long> buildAdvancedBranch(
      User user, RoadmapNode clearedNode, List<String> nodeTags, Long roadmapId) {

    int minSortOrder = clearedNode.getSortOrder() != null ? clearedNode.getSortOrder() : 0;

    Set<String> futureTagSet =
        new HashSet<>(
            nodeRequiredTagRepository.findFutureTagNamesByUserAndRoadmap(
                user.getId(), roadmapId, minSortOrder));

    // 이후 로드맵에서 이미 다루는 태그 제외
    List<String> candidateTags =
        nodeTags.stream().filter(tag -> !futureTagSet.contains(tag)).toList();

    if (candidateTags.isEmpty()) return List.of();

    RoadmapNode generated = generateBranchNode(clearedNode, candidateTags, true);
    suggestBranchChange(user, generated, "진단 퀴즈 고득점 — 심화 학습 노드가 추천되었습니다.", clearedNode.getNodeId());
    return List.of(generated.getNodeId());
  }

  // ── Gemini 호출 (분기 노드: 태그 선택 + 노드 생성 1콜) ────────────────────────

  /** Gemini 1콜로 후보 태그 중 적합한 태그를 고르고 그 태그 기반 분기 노드를 생성·저장한다. */
  private RoadmapNode generateBranchNode(
      RoadmapNode baseNode, List<String> candidateTags, boolean isAdvanced) {
    String tagList = String.join(", ", candidateTags);
    String prompt =
        isAdvanced
            ? String.format(
                "학습자가 '%s' 노드를 높은 점수로 클리어했습니다.\n"
                    + "선택 가능한 태그: [%s]\n"
                    + "위 태그 중 심화 학습에 가장 적합한 태그를 최대 3개 고르고, 그 태그로 심화 학습 노드를 생성하라.\n"
                    + "반드시 아래 JSON 형식으로만 응답하라:\n"
                    + "{\"tags\":[\"태그1\",\"태그2\"],\"title\":\"노드 제목\",\"content\":\"노드 설명 (2~3문장)\"}",
                baseNode.getTitle(), tagList)
            : String.format(
                "학습자가 '%s' 노드를 낮은 점수로 클리어했습니다.\n"
                    + "선택 가능한 태그: [%s]\n"
                    + "위 태그 중 복습이 필요한 태그를 최대 3개 고르고, 그 태그로 복습 학습 노드를 생성하라.\n"
                    + "반드시 아래 JSON 형식으로만 응답하라:\n"
                    + "{\"tags\":[\"태그1\",\"태그2\"],\"title\":\"노드 제목\",\"content\":\"노드 설명 (2~3문장)\"}",
                baseNode.getTitle(), tagList);

    Map<String, String> canonicalByLower =
        candidateTags.stream().collect(Collectors.toMap(String::toLowerCase, t -> t, (a, b) -> a));

    try {
      String response = geminiProvider.generateJson(prompt);
      if (response != null) {
        int start = response.indexOf('{');
        int end = response.lastIndexOf('}');
        if (start >= 0 && end > start) {
          JsonNode json = OBJECT_MAPPER.readTree(response.substring(start, end + 1));
          String title = json.path("title").asText(null);
          String content = json.path("content").asText(null);

          if (title != null && !title.isBlank()) {
            List<String> validatedTags = new java.util.ArrayList<>();
            JsonNode tagsNode = json.path("tags");
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

            return roadmapNodeRepository.save(
                RoadmapNode.builder()
                    .roadmap(systemDynamicRoadmapProvider.resolve())
                    .title(title)
                    .content(content)
                    .nodeType("BRANCH")
                    .sortOrder(null)
                    .subTopics(String.join(", ", validatedTags)) // 항상 canonical 태그 사용
                    .branchGroup(null)
                    .build());
          }
        }
      }
    } catch (Exception e) {
      log.warn("[DiagnosisQuizService] Gemini 분기 노드 생성 실패: {}", e.getMessage());
    }

    // Fallback: 기본 제목으로 노드 생성
    String fallbackTagList = String.join(", ", candidateTags.stream().limit(3).toList());
    String fallbackTitle = (isAdvanced ? "[심화] " : "[복습] ") + baseNode.getTitle();

    return roadmapNodeRepository.save(
        RoadmapNode.builder()
            .roadmap(baseNode.getRoadmap())
            .title(fallbackTitle)
            .content(fallbackTagList + " 관련 학습 내용입니다.")
            .nodeType("BRANCH")
            .sortOrder(null)
            .subTopics(fallbackTagList)
            .branchGroup(null)
            .build());
  }

  // ── 추천 변경 제안 생성 (SUGGESTED) ────────────────────────────────────────

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

  // ── 후속 노드 삭제 제안 생성 (고득점 전용) ──────────────────────────────────

  /**
   * 고득점 클리어 시, 학습자가 이미 숙지한 것으로 보이는 후속 노드를 Gemini가 판단해 DELETE 제안(SUGGESTED)으로 생성한다. 후보는
   * 클리어 노드 이후의 미완료 템플릿 노드 최대 {@link #DELETE_CANDIDATE_LIMIT}개로 한정하며, Gemini가 후보 밖 노드를 지목하면
   * 무시한다. 호출 실패/후보 없음/지목 없음이면 아무 제안도 만들지 않는다(과삭제 방지).
   */
  private void buildDeleteSuggestions(
      User user, RoadmapNode clearedNode, int score, int maxScore, Long roadmapId) {

    CustomRoadmap customRoadmap =
        customRoadmapRepository
            .findByUserIdAndOriginalRoadmapRoadmapId(user.getId(), roadmapId)
            .orElse(null);
    if (customRoadmap == null) return;

    List<CustomRoadmapNode> ordered =
        customRoadmapNodeRepository.findAllByCustomRoadmapOrderByCustomSortOrderAsc(customRoadmap);

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
    if (clearedOrder == null) return;

    // originalNodeId → 후보 노드 (삽입 순서 유지)
    Map<Long, CustomRoadmapNode> candidateById =
        ordered.stream()
            .filter(n -> n.getOriginalNode() != null)
            .filter(n -> !n.isBranch())
            .filter(n -> n.getStatus() != NodeStatus.COMPLETED)
            .filter(n -> n.getCustomSortOrder() != null && n.getCustomSortOrder() > clearedOrder)
            .limit(DELETE_CANDIDATE_LIMIT)
            .collect(
                Collectors.toMap(
                    n -> n.getOriginalNode().getNodeId(),
                    n -> n,
                    (a, b) -> a,
                    LinkedHashMap::new));
    if (candidateById.isEmpty()) return;

    long completedCount =
        ordered.stream().filter(n -> n.getStatus() == NodeStatus.COMPLETED).count();
    long proofCount = proofCardRepository.countByUserId(user.getId());
    List<String> userTags = userTechStackRepository.findTagNamesByUserId(user.getId());

    Map<Long, String> reasonByNodeId =
        getDeleteSuggestionsFromGemini(
            clearedNode.getTitle(),
            score,
            maxScore,
            completedCount,
            proofCount,
            userTags,
            candidateById);

    reasonByNodeId.forEach(
        (nodeId, reason) -> {
          CustomRoadmapNode target = candidateById.get(nodeId);
          if (target == null) return;

          boolean alreadySuggested =
              recommendationChangeRepository
                  .findTopByUserIdAndRoadmapNodeNodeIdAndChangeStatusOrderByCreatedAtDesc(
                      user.getId(), nodeId, RecommendationChangeStatus.SUGGESTED)
                  .isPresent();
          if (alreadySuggested) return;

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
        });
  }

  /** Gemini가 삭제를 제안할 후보 노드(originalNodeId)와 사유를 반환한다. 후보 집합 밖의 id는 모두 제외한다. */
  private Map<Long, String> getDeleteSuggestionsFromGemini(
      String clearedNodeTitle,
      int score,
      int maxScore,
      long completedCount,
      long proofCount,
      List<String> userTags,
      Map<Long, CustomRoadmapNode> candidateById) {

    StringBuilder candidateLines = new StringBuilder();
    candidateById.forEach(
        (nodeId, node) -> {
          List<String> tags = nodeRequiredTagRepository.findTagNamesByNodeId(nodeId);
          candidateLines
              .append("- id=")
              .append(nodeId)
              .append(", 제목=\"")
              .append(node.getOriginalNode().getTitle())
              .append("\", 태그=[")
              .append(String.join(", ", tags))
              .append("]\n");
        });

    String prompt =
        String.format(
            "학습자가 '%s' 노드를 %d/%d 점으로 클리어했습니다.\n"
                + "학습자 현황: 완료 노드 %d개, 보유 인증(Proof) %d개, 보유 기술 태그 [%s].\n"
                + "아래는 앞으로 학습할 후속 노드 후보입니다:\n%s"
                + "이 중 학습자가 이미 충분히 숙지하여 건너뛰어도 되는 노드만 골라 삭제를 제안하라.\n"
                + "확신이 없으면 포함하지 말 것. 없으면 빈 배열 []로 응답하라.\n"
                + "반드시 아래 JSON 배열로만 응답하라:\n"
                + "[{\"nodeId\":숫자,\"reason\":\"간단한 사유\"}]",
            clearedNodeTitle,
            score,
            maxScore,
            completedCount,
            proofCount,
            String.join(", ", userTags),
            candidateLines);

    Map<Long, String> result = new LinkedHashMap<>();
    try {
      String response = geminiProvider.generateJson(prompt);
      if (response != null) {
        int start = response.indexOf('[');
        int end = response.lastIndexOf(']');
        if (start >= 0 && end > start) {
          JsonNode array = OBJECT_MAPPER.readTree(response.substring(start, end + 1));
          if (array.isArray()) {
            for (JsonNode item : array) {
              if (!item.hasNonNull("nodeId")) continue;
              Long nodeId = item.get("nodeId").asLong();
              if (!candidateById.containsKey(nodeId)) continue; // 후보 밖 지목 무시
              result.put(nodeId, item.path("reason").asText(null));
            }
          }
        }
      }
    } catch (Exception e) {
      log.warn("[DiagnosisQuizService] Gemini 삭제 제안 추출 실패: {}", e.getMessage());
    }
    return result;
  }

  // ── 후속 노드 순서변경 제안 생성 ────────────────────────────────────────────

  private record ReorderSuggestion(Long moveNodeId, Long afterNodeId, String reason) {}

  /**
   * 클리어 시, 후속 노드들의 학습 순서를 Gemini가 더 합리적으로 재배치하도록 제안(REORDER, SUGGESTED)으로 생성한다. 후보는
   * 클리어 노드 이후의 미완료 노드 최대 {@link #REORDER_CANDIDATE_LIMIT}개. Gemini가 후보 밖/자기참조/되돌리기 불가한
   * 노드를 지목하면 폐기한다.
   */
  private void buildReorderSuggestions(User user, RoadmapNode clearedNode, Long roadmapId) {
    CustomRoadmap customRoadmap =
        customRoadmapRepository
            .findByUserIdAndOriginalRoadmapRoadmapId(user.getId(), roadmapId)
            .orElse(null);
    if (customRoadmap == null) return;

    List<CustomRoadmapNode> ordered =
        customRoadmapNodeRepository.findAllByCustomRoadmapOrderByCustomSortOrderAsc(customRoadmap);

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
    if (clearedOrder == null) return;

    // originalNodeId → 후보 노드 (현재 순서 유지). 척추/분기 구분 없이 후속 미완료 노드.
    Map<Long, CustomRoadmapNode> candidateById =
        ordered.stream()
            .filter(n -> n.getOriginalNode() != null)
            .filter(n -> n.getStatus() != NodeStatus.COMPLETED)
            .filter(n -> n.getCustomSortOrder() != null && n.getCustomSortOrder() > clearedOrder)
            .limit(REORDER_CANDIDATE_LIMIT)
            .collect(
                Collectors.toMap(
                    n -> n.getOriginalNode().getNodeId(),
                    n -> n,
                    (a, b) -> a,
                    LinkedHashMap::new));
    if (candidateById.size() < 2) return; // 2개 미만이면 순서변경 의미 없음

    List<ReorderSuggestion> suggestions =
        getReorderSuggestionsFromGemini(clearedNode, candidateById);

    for (ReorderSuggestion suggestion : suggestions) {
      Long moveId = suggestion.moveNodeId();
      Long afterId = suggestion.afterNodeId();

      // 검증: 이동 노드는 후보 내, 앵커는 후보 내·클리어 노드·null, 자기참조 금지
      if (moveId == null || !candidateById.containsKey(moveId)) continue;
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

      recommendationChangeRepository.save(
          RecommendationChange.builder()
              .user(user)
              .roadmapNode(candidateById.get(moveId).getOriginalNode())
              .reorderAfterNodeId(afterId)
              .reason(
                  suggestion.reason() != null && !suggestion.reason().isBlank()
                      ? suggestion.reason()
                      : "학습 순서상 더 적합한 위치로 이동을 제안합니다.")
              .nodeChangeType(NodeChangeType.REORDER)
              .build());
    }
  }

  /** Gemini가 후속 노드의 순서변경을 제안한다. {moveNodeId, afterNodeId, reason} 목록을 반환한다. */
  private List<ReorderSuggestion> getReorderSuggestionsFromGemini(
      RoadmapNode clearedNode, Map<Long, CustomRoadmapNode> candidateById) {

    StringBuilder candidateLines = new StringBuilder();
    candidateById.forEach(
        (nodeId, node) -> {
          List<String> tags = nodeRequiredTagRepository.findTagNamesByNodeId(nodeId);
          candidateLines
              .append("- id=")
              .append(nodeId)
              .append(", 제목=\"")
              .append(node.getOriginalNode().getTitle())
              .append("\", 태그=[")
              .append(String.join(", ", tags))
              .append("]\n");
        });

    String prompt =
        String.format(
            "학습자가 '%s'(id=%d) 노드를 클리어했습니다.\n"
                + "아래는 현재 순서대로 나열된 후속 학습 노드입니다:\n%s"
                + "학습 흐름상 순서를 바꾸는 게 더 합리적인 노드가 있으면 제안하라.\n"
                + "각 항목은 '이 노드(moveNodeId)를 afterNodeId 노드 바로 뒤로 이동'을 의미한다.\n"
                + "afterNodeId는 위 후보 id 또는 클리어한 노드 id(%d), 맨 앞으로 보내려면 null.\n"
                + "바꿀 필요가 없으면 빈 배열 []로 응답하라.\n"
                + "반드시 아래 JSON 배열로만 응답하라:\n"
                + "[{\"moveNodeId\":숫자,\"afterNodeId\":숫자또는null,\"reason\":\"간단한 사유\"}]",
            clearedNode.getTitle(),
            clearedNode.getNodeId(),
            candidateLines,
            clearedNode.getNodeId());

    List<ReorderSuggestion> result = new java.util.ArrayList<>();
    try {
      String response = geminiProvider.generateJson(prompt);
      if (response != null) {
        int start = response.indexOf('[');
        int end = response.lastIndexOf(']');
        if (start >= 0 && end > start) {
          JsonNode array = OBJECT_MAPPER.readTree(response.substring(start, end + 1));
          if (array.isArray()) {
            for (JsonNode item : array) {
              if (!item.hasNonNull("moveNodeId")) continue;
              Long moveId = item.get("moveNodeId").asLong();
              Long afterId =
                  item.hasNonNull("afterNodeId") ? item.get("afterNodeId").asLong() : null;
              result.add(new ReorderSuggestion(moveId, afterId, item.path("reason").asText(null)));
            }
          }
        }
      }
    } catch (Exception e) {
      log.warn("[DiagnosisQuizService] Gemini 순서변경 제안 추출 실패: {}", e.getMessage());
    }
    return result;
  }

  // ── 신규 노드 제안 생성 (Gemini가 학습수준+로드맵 현황 기반으로 생성·위치 결정) ──

  private record NewNodeSuggestion(
      String title, String content, String subTopics, Long afterCustomNodeId, String reason) {}

  /**
   * 클리어 시, 학습자의 수준과 커스텀 로드맵 전체 현황을 Gemini가 파악해 추가하면 좋을 신규 노드를 적절한 위치(앵커 뒤)에 삽입
   * 제안(ADD, SUGGESTED)으로 생성한다. TASK-39의 명시적 타깃 삽입 경로(target_custom_roadmap_id + anchor)를
   * 재사용하므로 수락 시 Gemini가 고른 위치에 삽입된다. 최대 {@link #NEW_NODE_LIMIT}개.
   */
  private void buildNewNodeSuggestions(
      User user, RoadmapNode clearedNode, int score, int maxScore, Long roadmapId) {

    CustomRoadmap customRoadmap =
        customRoadmapRepository
            .findByUserIdAndOriginalRoadmapRoadmapId(user.getId(), roadmapId)
            .orElse(null);
    if (customRoadmap == null) return;

    List<CustomRoadmapNode> nodes =
        customRoadmapNodeRepository.findAllByCustomRoadmapOrderByCustomSortOrderAsc(customRoadmap);
    if (nodes.isEmpty()) return;

    Map<Long, CustomRoadmapNode> nodeById =
        nodes.stream()
            .collect(
                Collectors.toMap(CustomRoadmapNode::getId, n -> n, (a, b) -> a, LinkedHashMap::new));

    long completedCount = nodes.stream().filter(n -> n.getStatus() == NodeStatus.COMPLETED).count();
    long proofCount = proofCardRepository.countByUserId(user.getId());
    List<String> userTags = userTechStackRepository.findTagNamesByUserId(user.getId());

    // 중복 방지: 이미 대기 중인 추천 노드 제목 집합
    Set<String> pendingTitles =
        recommendationChangeRepository
            .findAllByUserIdAndChangeStatusOrderByCreatedAtDesc(
                user.getId(), RecommendationChangeStatus.SUGGESTED)
            .stream()
            .map(rc -> rc.getRoadmapNode().getTitle())
            .collect(Collectors.toCollection(HashSet::new));

    List<NewNodeSuggestion> suggestions =
        getNewNodeSuggestionsFromGemini(
            clearedNode, score, maxScore, completedCount, proofCount, userTags, nodeById);

    for (NewNodeSuggestion suggestion : suggestions) {
      if (suggestion.title() == null || suggestion.title().isBlank()) continue;
      if (pendingTitles.contains(suggestion.title())) continue;

      CustomRoadmapNode anchor =
          suggestion.afterCustomNodeId() != null
              ? nodeById.get(suggestion.afterCustomNodeId())
              : null;

      RoadmapNode created =
          roadmapNodeRepository.save(
              RoadmapNode.builder()
                  .roadmap(systemDynamicRoadmapProvider.resolve())
                  .title(suggestion.title())
                  .content(suggestion.content())
                  .nodeType("USER")
                  .sortOrder(null)
                  .subTopics(suggestion.subTopics())
                  .branchGroup(null)
                  .build());

      recommendationChangeRepository.save(
          RecommendationChange.builder()
              .user(user)
              .roadmapNode(created)
              .branchFromNodeId(clearedNode.getNodeId()) // 변경 패널 표시 스코프용
              .targetCustomRoadmapId(customRoadmap.getId())
              .anchorCustomNodeId(anchor != null ? anchor.getId() : null)
              .reason(
                  suggestion.reason() != null && !suggestion.reason().isBlank()
                      ? suggestion.reason()
                      : "학습 수준과 로드맵 현황에 맞춰 추가하면 좋은 노드입니다.")
              .nodeChangeType(NodeChangeType.ADD)
              .build());

      pendingTitles.add(suggestion.title());
    }
  }

  /** Gemini가 학습자 맥락을 보고 추가할 신규 노드를 생성한다. {title, content, subTopics, afterCustomNodeId} 목록 반환. */
  private List<NewNodeSuggestion> getNewNodeSuggestionsFromGemini(
      RoadmapNode clearedNode,
      int score,
      int maxScore,
      long completedCount,
      long proofCount,
      List<String> userTags,
      Map<Long, CustomRoadmapNode> nodeById) {

    StringBuilder nodeLines = new StringBuilder();
    nodeById.forEach(
        (id, node) -> {
          String title =
              node.getOriginalNode() != null
                  ? node.getOriginalNode().getTitle()
                  : (node.getBuilderModule() != null ? node.getBuilderModule().getTitle() : "노드");
          nodeLines
              .append("- customNodeId=")
              .append(id)
              .append(", 제목=\"")
              .append(title)
              .append("\", 완료=")
              .append(node.getStatus() == NodeStatus.COMPLETED)
              .append("\n");
        });

    String prompt =
        String.format(
            "학습자가 '%s' 노드를 %d/%d 점으로 클리어했습니다.\n"
                + "학습자 현황: 완료 노드 %d개, 보유 인증(Proof) %d개, 보유 기술 태그 [%s].\n"
                + "아래는 학습자의 현재 로드맵 노드 목록입니다:\n%s"
                + "이 학습자의 수준과 로드맵 흐름을 고려해, 추가로 학습하면 좋을 신규 노드를 제안하라.\n"
                + "각 노드는 afterCustomNodeId 노드 바로 뒤에 삽입된다(목록의 customNodeId 중 하나, 맨 앞이면 null).\n"
                + "꼭 필요하지 않으면 빈 배열 []로 응답하라. 최대 %d개.\n"
                + "반드시 아래 JSON 배열로만 응답하라:\n"
                + "[{\"title\":\"제목\",\"content\":\"2~3문장 설명\",\"subTopics\":\"소주제1,소주제2\",\"afterCustomNodeId\":숫자또는null,\"reason\":\"간단한 사유\"}]",
            clearedNode.getTitle(),
            score,
            maxScore,
            completedCount,
            proofCount,
            String.join(", ", userTags),
            nodeLines,
            NEW_NODE_LIMIT);

    List<NewNodeSuggestion> result = new java.util.ArrayList<>();
    try {
      String response = geminiProvider.generateJson(prompt);
      if (response != null) {
        int start = response.indexOf('[');
        int end = response.lastIndexOf(']');
        if (start >= 0 && end > start) {
          JsonNode array = OBJECT_MAPPER.readTree(response.substring(start, end + 1));
          if (array.isArray()) {
            for (JsonNode item : array) {
              if (result.size() >= NEW_NODE_LIMIT) break;
              String title = item.path("title").asText(null);
              if (title == null || title.isBlank()) continue;
              Long afterId =
                  item.hasNonNull("afterCustomNodeId")
                      ? item.get("afterCustomNodeId").asLong()
                      : null;
              result.add(
                  new NewNodeSuggestion(
                      title,
                      item.path("content").asText(null),
                      item.path("subTopics").asText(null),
                      afterId,
                      item.path("reason").asText(null)));
            }
          }
        }
      }
    } catch (Exception e) {
      log.warn("[DiagnosisQuizService] Gemini 신규 노드 제안 추출 실패: {}", e.getMessage());
    }
    return result;
  }

  // ── [TEST] 노드 완료 즉시 추천 테스트 ── 실 서비스 전 삭제 대상 ────────────

  /** [TEST] 진단 퀴즈 없이 랜덤 점수로 즉시 분기 추천을 생성한다. 노드 완료 시 추천 동작을 확인하기 위한 테스트 전용 메서드. */
  @Transactional
  public DiagnosisQuizDto.TestRunResponse testRunRecommend(
      Long userId, Long roadmapId, Long originalNodeId) {
    int maxScore = 100;
    int score = resolveTestRunScore(userId, originalNodeId, maxScore);

    String recommendedNodes =
        analyzeAndRecommend(userId, originalNodeId, score, maxScore, roadmapId);

    boolean isLowScore = (double) score / maxScore < REVIEW_THRESHOLD;
    return DiagnosisQuizDto.TestRunResponse.builder()
        .score(score)
        .maxScore(maxScore)
        .branchType(isLowScore ? "REVIEW" : "ADVANCED")
        .recommendedNodes(recommendedNodes)
        .build();
  }

  // ── 유틸 ───────────────────────────────────────────────────────────────────

  private int determineQuestionCount(QuizDifficulty difficulty) {
    return switch (difficulty) {
      case BEGINNER -> 5;
      case INTERMEDIATE -> 7;
      case ADVANCED -> 10;
    };
  }

  private int resolveTestRunScore(Long userId, Long originalNodeId, int maxScore) {
    User user = userId == null ? null : userRepository.findById(userId).orElse(null);
    RoadmapNode node =
        originalNodeId == null ? null : roadmapNodeRepository.findById(originalNodeId).orElse(null);
    List<String> tags =
        originalNodeId == null
            ? List.of()
            : nodeRequiredTagRepository.findTagNamesByNodeId(originalNodeId);

    if (isFrontendRoadmapDemoFallback(user, node, tags)) {
      return Math.min(maxScore, FRONTEND_ROADMAP_DEMO_SCORE);
    }

    return 60 + RANDOM.nextInt(41);
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
      User user, RoadmapNode clearedNode, Long roadmapId, boolean isLowScore) {
    String title =
        isLowScore ? FRONTEND_ROADMAP_DEMO_REVIEW_TITLE : FRONTEND_ROADMAP_DEMO_ADVANCED_TITLE;

    RecommendationChange existingChange =
        findExistingFrontendRoadmapDemoChange(user.getId(), roadmapId, title);
    if (existingChange != null) {
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

    CustomRoadmap customRoadmap = findCustomRoadmap(user.getId(), roadmapId);
    CustomRoadmapNode anchor = findAnchorCustomNode(customRoadmap, clearedNode.getNodeId());

    recommendationChangeRepository.save(
        RecommendationChange.builder()
            .user(user)
            .roadmapNode(generated)
            .branchFromNodeId(clearedNode.getNodeId())
            .targetCustomRoadmapId(customRoadmap == null ? null : customRoadmap.getId())
            .anchorCustomNodeId(anchor == null ? null : anchor.getId())
            .branchType(isLowScore ? "REVIEW" : "ADVANCED")
            .reason(frontendRoadmapDemoReason(isLowScore))
            .contextSummary("frontend-rendering-demo-fallback; score=" + FRONTEND_ROADMAP_DEMO_SCORE)
            .nodeChangeType(NodeChangeType.ADD)
            .build());

    return List.of(generated.getNodeId());
  }

  private RecommendationChange findExistingFrontendRoadmapDemoChange(
      Long userId, Long roadmapId, String title) {
    List<RecommendationChange> changes =
        roadmapId == null
            ? recommendationChangeRepository.findAllByUserIdAndChangeStatusOrderByCreatedAtDesc(
                userId, RecommendationChangeStatus.SUGGESTED)
            : recommendationChangeRepository
                .findAllByUserIdAndRoadmapNodeRoadmapRoadmapIdAndChangeStatusOrderByCreatedAtDesc(
                    userId, roadmapId, RecommendationChangeStatus.SUGGESTED);

    return changes.stream()
        .filter(change -> change.getRoadmapNode() != null)
        .filter(change -> title.equals(change.getRoadmapNode().getTitle()))
        .findFirst()
        .orElse(null);
  }

  private CustomRoadmap findCustomRoadmap(Long userId, Long roadmapId) {
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
      log.warn("[DiagnosisQuizService] Frontend roadmap demo fallback delay interrupted.");
    }
  }

  private String frontendRoadmapDemoContent(boolean isLowScore) {
    if (isLowScore) {
      return "Review how DOM, CSSOM, render tree, layout, and paint connect in the browser rendering pipeline. Rebuild the first Vite page with DevTools open and explain which JavaScript DOM changes trigger visual updates.";
    }

    return "Go deeper on rendering performance by connecting DOM updates, style recalculation, layout, and paint costs. Use DevTools to compare a small Vite interaction before and after reducing unnecessary DOM writes.";
  }

  private String frontendRoadmapDemoSubTopics(boolean isLowScore) {
    return isLowScore
        ? "DOM,CSSOM,Render Tree,Layout,Paint,Vite"
        : "DOM,CSSOM,Render Tree,Layout,Paint,DevTools,Vite";
  }

  private String frontendRoadmapDemoReason(boolean isLowScore) {
    if (isLowScore) {
      return "Review recommendation generated from the first frontend rendering node demo fallback.";
    }

    return "Advanced recommendation generated from the first frontend rendering node demo fallback.";
  }

  private int calculateScore(Map<Integer, String> answers) {
    // 퀴즈 문항 저장 구조가 없어 임시 점수 사용 (추후 실제 채점 로직으로 교체 예정)
    return 60 + RANDOM.nextInt(41);
  }

}
