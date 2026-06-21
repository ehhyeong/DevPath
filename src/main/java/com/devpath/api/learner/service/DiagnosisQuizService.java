package com.devpath.api.learner.service;

import com.devpath.api.learner.component.CourseScoreAnalyzer;
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
import com.fasterxml.jackson.databind.node.MissingNode;
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
  // 통합 추천 응답 토큰 한도 (4종 제안을 한 번에 받으므로 넉넉히 둔다)
  private static final int UNIFIED_MAX_OUTPUT_TOKENS = 8192;
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
  private final CourseScoreAnalyzer courseScoreAnalyzer;

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

    CourseScoreAnalyzer.CourseScores courseScores =
        courseScoreAnalyzer.analyze(userId, clearedNodeId);
    int score = resolveScore(courseScores);
    int maxScore = 100;

    String recommendedNodes =
        analyzeAndRecommend(
            userId, clearedNodeId, score, quiz.getRoadmap().getRoadmapId(), courseScores);

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
      return buildFrontendRoadmapDemoFallback(user, clearedNode, roadmapId, isLowScore).stream()
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

    String prompt =
        buildUnifiedPrompt(
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
            userTags);

    JsonNode root = callUnifiedGemini(prompt);

    // 섹션별 독립 적용 (한 섹션이 깨져도 나머지는 저장)
    List<Long> branchIds =
        applyBranch(user, clearedNode, branchCandidateTags, isLowScore, section(root, "branch"));
    if (!isLowScore) {
      applyDeletes(user, deleteCandidates, section(root, "deletes"));
    }
    applyReorders(user, clearedNode, reorderCandidates, section(root, "reorders"));
    applyNewNodes(user, clearedNode, customRoadmap, newNodeById, section(root, "newNodes"));

    return branchIds.stream().map(String::valueOf).collect(Collectors.joining(","));
  }

  // ── 통합 프롬프트 / 단일 호출 / 스키마 ──────────────────────────────────────

  private String buildUnifiedPrompt(
      RoadmapNode clearedNode,
      int score,
      boolean isLowScore,
      CourseScoreAnalyzer.CourseScores courseScores,
      List<String> branchCandidateTags,
      Map<Long, CustomRoadmapNode> deleteCandidates,
      Map<Long, CustomRoadmapNode> reorderCandidates,
      Map<Long, CustomRoadmapNode> newNodeById,
      long completedCount,
      long proofCount,
      List<String> userTags) {

    StringBuilder sb = new StringBuilder();
    sb.append(
        String.format(
            "학습자가 '%s'(id=%d) 노드를 %d/100점으로 클리어했습니다.%n",
            clearedNode.getTitle(), clearedNode.getNodeId(), score));
    sb.append(
        String.format(
            "학습자 현황: 완료 노드 %d개, 보유 인증(Proof) %d개, 보유 기술 태그 [%s].%n%n",
            completedCount, proofCount, String.join(", ", userTags)));

    // 강의별 성취도: 같은 노드라도 어느 강의를 통해 학습했는지에 따라 강약이 다를 수 있어 함께 제공한다.
    if (courseScores.hasData()) {
      sb.append("[강의별 성취도]\n");
      courseScores
          .perCourse()
          .forEach(cs -> sb.append(String.format("- %s: %d점%n", cs.courseName(), cs.percent())));
      sb.append("강의별로 강약이 다르면 점수가 낮은 강의 영역은 복습을, 높은 영역은 심화를 우선 고려해 추천하라.\n\n");
    }

    // 1) 분기 노드
    sb.append("[분기 노드]\n");
    sb.append(String.format("선택 가능한 태그: [%s]%n", String.join(", ", branchCandidateTags)));
    sb.append(
        isLowScore
            ? "위 태그 중 복습이 필요한 태그를 최대 3개 골라 복습 학습 노드를 생성하라.\n\n"
            : "위 태그 중 심화 학습에 가장 적합한 태그를 최대 3개 골라 심화 학습 노드를 생성하라.\n\n");

    // 2) 삭제 제안 (고득점 + 후보 존재 시에만 요청)
    if (!isLowScore && !deleteCandidates.isEmpty()) {
      sb.append("[삭제 제안]\n후속 노드 후보:\n");
      appendCandidateTagLines(sb, deleteCandidates);
      sb.append("이 중 학습자가 이미 충분히 숙지하여 건너뛰어도 되는 노드만 골라 삭제를 제안하라. 확신이 없으면 포함하지 말 것.\n\n");
    }

    // 3) 순서변경 제안 (후보 2개 이상일 때만)
    if (reorderCandidates.size() >= 2) {
      sb.append("[순서변경 제안]\n현재 순서대로 나열된 후속 노드:\n");
      appendCandidateTagLines(sb, reorderCandidates);
      sb.append(
          String.format(
              "학습 흐름상 순서를 바꾸는 게 더 합리적인 노드가 있으면 제안하라. moveNodeId를 afterNodeId"
                  + "(위 후보 id 또는 클리어한 노드 id=%d, 맨 앞으로 보내려면 null) 바로 뒤로 이동하는 의미다.%n%n",
              clearedNode.getNodeId()));
    }

    // 4) 신규 노드 제안
    if (!newNodeById.isEmpty()) {
      sb.append("[신규 노드 제안]\n현재 로드맵 노드 목록:\n");
      newNodeById.forEach(
          (id, node) -> {
            String title =
                node.getOriginalNode() != null
                    ? node.getOriginalNode().getTitle()
                    : (node.getBuilderModule() != null ? node.getBuilderModule().getTitle() : "노드");
            sb.append(
                String.format(
                    "- customNodeId=%d, 제목=\"%s\", 완료=%b%n",
                    id, title, node.getStatus() == NodeStatus.COMPLETED));
          });
      sb.append(
          String.format(
              "학습자 수준과 로드맵 흐름을 고려해 추가하면 좋을 신규 노드를 최대 %d개, afterCustomNodeId"
                  + "(위 목록 중 하나, 맨 앞이면 null) 위치에 제안하라. 꼭 필요하지 않으면 비워라.%n%n",
              NEW_NODE_LIMIT));
    }

    sb.append("아래 JSON 스키마로만 응답하라. 제안할 내용이 없는 섹션은 빈 배열 또는 빈 값으로 두라.\n");
    sb.append(
        "{\"branch\":{\"tags\":[\"태그\"],\"title\":\"제목\",\"content\":\"2~3문장 설명\"},"
            + "\"deletes\":[{\"nodeId\":숫자,\"reason\":\"사유\"}],"
            + "\"reorders\":[{\"moveNodeId\":숫자,\"afterNodeId\":숫자또는null,\"reason\":\"사유\"}],"
            + "\"newNodes\":[{\"title\":\"제목\",\"content\":\"설명\",\"subTopics\":\"소주제1,소주제2\","
            + "\"afterCustomNodeId\":숫자또는null,\"reason\":\"사유\"}]}");
    return sb.toString();
  }

  private void appendCandidateTagLines(
      StringBuilder sb, Map<Long, CustomRoadmapNode> candidateById) {
    candidateById.forEach(
        (nodeId, node) -> {
          List<String> tags = nodeRequiredTagRepository.findTagNamesByNodeId(nodeId);
          sb.append(
              String.format(
                  "- id=%d, 제목=\"%s\", 태그=[%s]%n",
                  nodeId, node.getOriginalNode().getTitle(), String.join(", ", tags)));
        });
  }

  /** 통합 프롬프트로 단일 호출하고 응답 JSON 객체를 반환한다. 실패 시 null. */
  private JsonNode callUnifiedGemini(String prompt) {
    try {
      String response =
          geminiProvider.generateJson(prompt, unifiedSchema(), UNIFIED_MAX_OUTPUT_TOKENS);
      if (response == null) return null;
      int start = response.indexOf('{');
      int end = response.lastIndexOf('}');
      if (start < 0 || end <= start) return null;
      return OBJECT_MAPPER.readTree(response.substring(start, end + 1));
    } catch (Exception e) {
      log.warn("[DiagnosisQuizService] 통합 추천 응답 파싱 실패: {}", e.getMessage());
      return null;
    }
  }

  /** 통합 응답에서 한 섹션을 안전하게 꺼낸다(루트가 없으면 Missing). */
  private JsonNode section(JsonNode root, String key) {
    return root == null ? MissingNode.getInstance() : root.path(key);
  }

  private Map<String, Object> unifiedSchema() {
    Map<String, Object> strType = Map.of("type", "string");
    Map<String, Object> intType = Map.of("type", "integer");
    Map<String, Object> nullableInt = Map.of("type", "integer", "nullable", true);

    Map<String, Object> branch =
        Map.of(
            "type",
            "object",
            "properties",
            Map.of(
                "tags", Map.of("type", "array", "items", strType),
                "title", strType,
                "content", strType));

    Map<String, Object> deleteItem =
        Map.of("type", "object", "properties", Map.of("nodeId", intType, "reason", strType));

    Map<String, Object> reorderItem =
        Map.of(
            "type",
            "object",
            "properties",
            Map.of("moveNodeId", intType, "afterNodeId", nullableInt, "reason", strType));

    Map<String, Object> newNodeItem =
        Map.of(
            "type",
            "object",
            "properties",
            Map.of(
                "title", strType,
                "content", strType,
                "subTopics", strType,
                "afterCustomNodeId", nullableInt,
                "reason", strType));

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
    CourseScoreAnalyzer.CourseScores courseScores =
        courseScoreAnalyzer.analyze(userId, originalNodeId);
    int score = resolveTestRunScore(userId, originalNodeId, courseScores);

    String recommendedNodes =
        analyzeAndRecommend(userId, originalNodeId, score, roadmapId, courseScores);

    boolean isLowScore = (double) score / 100 < REVIEW_THRESHOLD;
    return DiagnosisQuizDto.TestRunResponse.builder()
        .score(score)
        .maxScore(100)
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
      User user, RoadmapNode clearedNode, Long roadmapId, boolean isLowScore) {
    String title =
        isLowScore ? FRONTEND_ROADMAP_DEMO_REVIEW_TITLE : FRONTEND_ROADMAP_DEMO_ADVANCED_TITLE;
    String legacyTitle =
        isLowScore
            ? FRONTEND_ROADMAP_DEMO_LEGACY_REVIEW_TITLE
            : FRONTEND_ROADMAP_DEMO_LEGACY_ADVANCED_TITLE;

    RecommendationChange existingChange =
        findExistingFrontendRoadmapDemoChange(user.getId(), title, legacyTitle);
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
            .contextSummary(frontendRoadmapDemoContextSummary())
            .nodeChangeType(NodeChangeType.ADD)
            .build());

    return List.of(generated.getNodeId());
  }

  private RecommendationChange findExistingFrontendRoadmapDemoChange(
      Long userId, String title, String legacyTitle) {
    List<RecommendationChange> changes =
        recommendationChangeRepository.findAllByUserIdAndChangeStatusOrderByCreatedAtDesc(
            userId, RecommendationChangeStatus.SUGGESTED);

    return changes.stream()
        .filter(change -> change.getRoadmapNode() != null)
        .filter(
            change ->
                title.equals(change.getRoadmapNode().getTitle())
                    || legacyTitle.equals(change.getRoadmapNode().getTitle()))
        .findFirst()
        .orElse(null);
  }

  private void refreshFrontendRoadmapDemoChange(
      RecommendationChange change, boolean isLowScore) {
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
    change.updateSuggestionText(frontendRoadmapDemoReason(isLowScore), frontendRoadmapDemoContextSummary());
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
      return "브라우저 렌더링 흐름에서 DOM, CSSOM, 렌더 트리, 레이아웃, 페인트가 어떻게 이어지는지 다시 점검합니다. 첫 Vite 페이지를 DevTools와 함께 다시 구현하면서 JavaScript DOM 변경이 어떤 화면 갱신을 만드는지 설명해 봅니다.";
    }

    return "DOM 업데이트, 스타일 재계산, 레이아웃, 페인트 비용을 연결해서 렌더링 성능을 더 깊게 다룹니다. 작은 Vite 인터랙션을 기준으로 불필요한 DOM 쓰기를 줄이기 전후를 DevTools로 비교합니다.";
  }

  private String frontendRoadmapDemoSubTopics(boolean isLowScore) {
    return isLowScore
        ? "DOM,CSSOM,렌더 트리,레이아웃,페인트,Vite"
        : "DOM,CSSOM,렌더 트리,레이아웃,페인트,DevTools,Vite";
  }

  private String frontendRoadmapDemoReason(boolean isLowScore) {
    if (isLowScore) {
      return "첫 프론트엔드 렌더링 노드에서 보완이 필요한 흐름을 다시 확인하도록 생성된 복습 추천입니다.";
    }

    return "첫 프론트엔드 렌더링 노드를 안정적으로 완료했기 때문에 렌더링 성능까지 확장하도록 생성된 심화 추천입니다.";
  }

  private String frontendRoadmapDemoContextSummary() {
    return "프론트엔드 렌더링 시연 fallback; 점수=" + FRONTEND_ROADMAP_DEMO_SCORE;
  }
}
