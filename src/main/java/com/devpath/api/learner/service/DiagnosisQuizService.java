package com.devpath.api.learner.service;

import com.devpath.api.learner.dto.DiagnosisQuizDto;
import com.devpath.api.roadmap.service.SystemDynamicRoadmapProvider;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.common.provider.GeminiProvider;
import com.devpath.domain.learning.entity.recommendation.NodeChangeType;
import com.devpath.domain.learning.entity.recommendation.RecommendationChange;
import com.devpath.domain.learning.repository.recommendation.RecommendationChangeRepository;
import com.devpath.domain.roadmap.entity.DiagnosisQuiz;
import com.devpath.domain.roadmap.entity.DiagnosisResult;
import com.devpath.domain.roadmap.entity.QuizDifficulty;
import com.devpath.domain.roadmap.entity.Roadmap;
import com.devpath.domain.roadmap.entity.RoadmapNode;
import com.devpath.domain.roadmap.repository.DiagnosisQuizRepository;
import com.devpath.domain.roadmap.repository.DiagnosisResultRepository;
import com.devpath.domain.roadmap.repository.NodeRequiredTagRepository;
import com.devpath.domain.roadmap.repository.RoadmapNodeRepository;
import com.devpath.domain.roadmap.repository.RoadmapRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.HashSet;
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

  private final DiagnosisQuizRepository diagnosisQuizRepository;
  private final DiagnosisResultRepository diagnosisResultRepository;
  private final RoadmapRepository roadmapRepository;
  private final RoadmapNodeRepository roadmapNodeRepository;
  private final UserRepository userRepository;
  private final NodeRequiredTagRepository nodeRequiredTagRepository;
  private final RecommendationChangeRepository recommendationChangeRepository;
  private final SystemDynamicRoadmapProvider systemDynamicRoadmapProvider;
  private final GeminiProvider geminiProvider;

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

    List<Long> recommendedNodeIds =
        isLowScore
            ? buildReviewBranch(user, clearedNode, nodeTags, roadmapId)
            : buildAdvancedBranch(user, clearedNode, nodeTags, roadmapId);

    return recommendedNodeIds.stream().map(String::valueOf).collect(Collectors.joining(","));
  }

  /** 복습 브랜치: 낮은 점수 → Gemini가 복습 태그 선택 후 새 복습 노드 생성 */
  private List<Long> buildReviewBranch(
      User user, RoadmapNode clearedNode, List<String> nodeTags, Long roadmapId) {

    List<String> reviewTags = getTagsFromGemini(clearedNode.getTitle(), nodeTags, false);
    if (reviewTags.isEmpty()) return List.of();

    RoadmapNode generated = generateAndSaveNode(clearedNode, reviewTags, "REVIEW");
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

    // 필터된 태그 중 Gemini가 심화 학습에 적합한 태그 선택
    List<String> advancedTags = getTagsFromGemini(clearedNode.getTitle(), candidateTags, true);
    if (advancedTags.isEmpty()) return List.of();

    RoadmapNode generated = generateAndSaveNode(clearedNode, advancedTags, "ADVANCED");
    suggestBranchChange(user, generated, "진단 퀴즈 고득점 — 심화 학습 노드가 추천되었습니다.", clearedNode.getNodeId());
    return List.of(generated.getNodeId());
  }

  // ── Gemini 호출 ────────────────────────────────────────────────────────────

  private List<String> getTagsFromGemini(String nodeTitle, List<String> tags, boolean isAdvanced) {
    String tagList = String.join(", ", tags);
    String prompt =
        isAdvanced
            ? String.format(
                "학습자가 '%s' 노드를 높은 점수로 클리어했습니다.\n"
                    + "이 노드의 핵심 태그: [%s]\n"
                    + "다음 단계로 학습하면 좋을 심화 태그를 최대 3개 골라 JSON 배열로만 응답하라.\n"
                    + "예시: [\"태그1\",\"태그2\"]",
                nodeTitle, tagList)
            : String.format(
                "학습자가 '%s' 노드를 낮은 점수로 클리어했습니다.\n"
                    + "이 노드의 핵심 태그: [%s]\n"
                    + "복습이 필요한 태그를 최대 3개 골라 JSON 배열로만 응답하라.\n"
                    + "예시: [\"태그1\",\"태그2\"]",
                nodeTitle, tagList);

    try {
      String response = geminiProvider.generate(prompt);
      if (response != null) {
        List<String> parsed = parseJsonArray(response);
        if (!parsed.isEmpty()) {
          // Gemini 응답을 canonical 태그로 필터링 (case-insensitive)
          Map<String, String> canonicalByLower =
              tags.stream().collect(Collectors.toMap(String::toLowerCase, t -> t, (a, b) -> a));
          List<String> validated =
              parsed.stream()
                  .map(t -> canonicalByLower.get(t.toLowerCase()))
                  .filter(Objects::nonNull)
                  .toList();
          if (!validated.isEmpty()) return validated;
        }
      }
    } catch (Exception e) {
      log.warn("[DiagnosisQuizService] Gemini 태그 추출 실패: {}", e.getMessage());
    }
    return tags.stream().limit(3).toList();
  }

  /** Gemini를 이용해 태그 기반의 새 학습 노드를 생성하고 저장한다. */
  private RoadmapNode generateAndSaveNode(
      RoadmapNode baseNode, List<String> tags, String branchType) {
    String tagList = String.join(", ", tags);
    String prompt =
        branchType.equals("ADVANCED")
            ? String.format(
                "학습자가 '%s' 노드를 높은 점수로 클리어했습니다.\n"
                    + "다음 태그들을 바탕으로 심화 학습 노드를 생성하세요: [%s]\n"
                    + "반드시 아래 JSON 형식으로만 응답하라:\n"
                    + "{\"title\":\"노드 제목\",\"content\":\"노드 설명 (2~3문장)\",\"subTopics\":\"소주제1,소주제2\"}",
                baseNode.getTitle(), tagList)
            : String.format(
                "학습자가 '%s' 노드를 낮은 점수로 클리어했습니다.\n"
                    + "다음 태그들을 바탕으로 복습 노드를 생성하세요: [%s]\n"
                    + "반드시 아래 JSON 형식으로만 응답하라:\n"
                    + "{\"title\":\"노드 제목\",\"content\":\"노드 설명 (2~3문장)\",\"subTopics\":\"소주제1,소주제2\"}",
                baseNode.getTitle(), tagList);

    try {
      String response = geminiProvider.generate(prompt);
      if (response != null) {
        int start = response.indexOf('{');
        int end = response.lastIndexOf('}');
        if (start >= 0 && end > start) {
          JsonNode json = OBJECT_MAPPER.readTree(response.substring(start, end + 1));
          String title = json.path("title").asText(null);
          String content = json.path("content").asText(null);
          if (title != null) {
            return roadmapNodeRepository.save(
                RoadmapNode.builder()
                    .roadmap(systemDynamicRoadmapProvider.resolve())
                    .title(title)
                    .content(content)
                    .nodeType("BRANCH")
                    .sortOrder(null)
                    .subTopics(tagList) // 항상 canonical 태그 사용
                    .branchGroup(null)
                    .build());
          }
        }
      }
    } catch (Exception e) {
      log.warn("[DiagnosisQuizService] Gemini 노드 생성 실패: {}", e.getMessage());
    }

    // Fallback: 기본 제목으로 노드 생성
    String fallbackTitle =
        branchType.equals("ADVANCED")
            ? "[심화] " + baseNode.getTitle()
            : "[복습] " + baseNode.getTitle();

    return roadmapNodeRepository.save(
        RoadmapNode.builder()
            .roadmap(baseNode.getRoadmap())
            .title(fallbackTitle)
            .content(tagList + " 관련 학습 내용입니다.")
            .nodeType("BRANCH")
            .sortOrder(null)
            .subTopics(tagList)
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

  // ── [TEST] 노드 완료 즉시 추천 테스트 ── 실 서비스 전 삭제 대상 ────────────

  /** [TEST] 진단 퀴즈 없이 랜덤 점수로 즉시 분기 추천을 생성한다. 노드 완료 시 추천 동작을 확인하기 위한 테스트 전용 메서드. */
  @Transactional
  public DiagnosisQuizDto.TestRunResponse testRunRecommend(
      Long userId, Long roadmapId, Long originalNodeId) {
    int score = 60 + RANDOM.nextInt(41);
    int maxScore = 100;

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

  private int calculateScore(Map<Integer, String> answers) {
    // 퀴즈 문항 저장 구조가 없어 임시 점수 사용 (추후 실제 채점 로직으로 교체 예정)
    return 60 + RANDOM.nextInt(41);
  }

  private List<String> parseJsonArray(String response) {
    try {
      int start = response.indexOf('[');
      int end = response.lastIndexOf(']');
      if (start >= 0 && end > start) {
        String json = response.substring(start, end + 1);
        return OBJECT_MAPPER.readValue(
            json, OBJECT_MAPPER.getTypeFactory().constructCollectionType(List.class, String.class));
      }
    } catch (Exception e) {
      log.warn("[DiagnosisQuizService] JSON 파싱 실패: {}", e.getMessage());
    }
    return List.of();
  }
}
