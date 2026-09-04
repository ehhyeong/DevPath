package com.devpath.api.learning.service;

import com.devpath.api.learning.dto.SupplementRecommendationResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.course.entity.CourseNodeMapping;
import com.devpath.domain.course.repository.CourseNodeMappingRepository;
import com.devpath.domain.course.repository.CourseTagMapRepository;
import com.devpath.domain.learning.entity.LessonProgress;
import com.devpath.domain.learning.entity.recommendation.RecommendationStatus;
import com.devpath.domain.learning.entity.recommendation.RiskWarning;
import com.devpath.domain.learning.entity.recommendation.SupplementRecommendation;
import com.devpath.domain.learning.repository.LessonProgressRepository;
import com.devpath.domain.learning.repository.TilDraftRepository;
import com.devpath.domain.learning.repository.TimestampNoteRepository;
import com.devpath.domain.learning.repository.ocr.OcrResultRepository;
import com.devpath.domain.learning.repository.recommendation.RiskWarningRepository;
import com.devpath.domain.learning.repository.recommendation.SupplementRecommendationRepository;
import com.devpath.domain.learning.service.LearningAutomationPolicyService;
import com.devpath.domain.learning.service.LearningAutomationRuleCatalog;
import com.devpath.domain.learning.service.SupplementRecommendationLifecycleService;
import com.devpath.domain.operation.recommendation.RecommendationAlgorithmPolicy;
import com.devpath.domain.roadmap.entity.RoadmapNode;
import com.devpath.domain.roadmap.repository.RoadmapNodeRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SupplementRecommendationService {

  private final SupplementRecommendationRepository supplementRecommendationRepository;
  private final RoadmapNodeRepository roadmapNodeRepository;
  private final RiskWarningRepository riskWarningRepository;
  private final UserRepository userRepository;
  private final SupplementRecommendationMetrics recommendationMetrics;
  private final CourseNodeMappingRepository courseNodeMappingRepository;
  private final CourseTagMapRepository courseTagMapRepository;
  private final LessonProgressRepository lessonProgressRepository;
  private final TimestampNoteRepository timestampNoteRepository;
  private final TilDraftRepository tilDraftRepository;
  private final OcrResultRepository ocrResultRepository;
  private final LearningAutomationPolicyService learningAutomationPolicyService;
  private final RecommendationAlgorithmPolicy recommendationAlgorithmPolicy;
  private final SupplementRecommendationLifecycleService recommendationLifecycleService;

  @Transactional
  public SupplementRecommendationResponse createRecommendation(
      Long userId, Long nodeId, String reason) {
    if (!learningAutomationPolicyService.isEnabled(
        LearningAutomationRuleCatalog.SUPPLEMENT_RECOMMENDATION_ENABLED, true)) {
      throw new CustomException(ErrorCode.LEARNING_RULE_DISABLED);
    }

    User user = validateUser(userId);
    ResolvedCandidate candidate = resolveCandidate(userId, nodeId);
    String finalReason = resolveReason(candidate, reason);

    SupplementRecommendation recommendation =
        SupplementRecommendation.builder()
            .user(user)
            .roadmapNode(candidate.node())
            .reason(finalReason)
            .priority(candidate.metrics().priority())
            .coveragePercent(candidate.metrics().coveragePercent())
            .missingTagCount(candidate.metrics().missingTagCount())
            .build();

    SupplementRecommendation saved = supplementRecommendationRepository.save(recommendation);
    recommendationLifecycleService.recordCreated(saved);
    createRiskWarningIfNeeded(user, candidate.node(), candidate.metrics());
    return SupplementRecommendationResponse.from(saved);
  }

  @Transactional
  public SupplementRecommendationResponse approveRecommendation(
      Long userId, Long recommendationId) {
    return SupplementRecommendationResponse.from(
        recommendationLifecycleService.approve(userId, recommendationId));
  }

  @Transactional
  public SupplementRecommendationResponse rejectRecommendation(Long userId, Long recommendationId) {
    return SupplementRecommendationResponse.from(
        recommendationLifecycleService.reject(userId, recommendationId));
  }

  private ResolvedCandidate resolveCandidate(Long userId, Long nodeId) {
    if (nodeId != null) {
      RoadmapNode node =
          roadmapNodeRepository
              .findById(nodeId)
              .orElseThrow(() -> new CustomException(ErrorCode.ROADMAP_NODE_NOT_FOUND));
      return ResolvedCandidate.manual(node, recommendationMetrics.calculate(userId, nodeId));
    }
    return selectAutomaticCandidate(userId);
  }

  private ResolvedCandidate selectAutomaticCandidate(Long userId) {
    List<LessonProgress> progresses =
        lessonProgressRepository.findAllByUserId(userId).stream()
            .filter(this::hasMeaningfulProgress)
            .toList();

    if (progresses.isEmpty()) {
      throw new CustomException(
          ErrorCode.LESSON_PROGRESS_NOT_FOUND, "학습 진행 데이터가 없어 자동 보강 후보를 생성할 수 없습니다.");
    }

    Set<String> userSkills = recommendationMetrics.loadUserSkills(userId);
    List<Long> courseIds =
        progresses.stream()
            .map(progress -> progress.getLesson().getSection().getCourse().getCourseId())
            .distinct()
            .toList();

    Map<Long, List<CourseNodeMapping>> mappingsByCourseId =
        courseNodeMappingRepository.findAllByCourseCourseIdIn(courseIds).stream()
            .collect(
                Collectors.groupingBy(
                    mapping -> mapping.getCourse().getCourseId(),
                    LinkedHashMap::new,
                    Collectors.toList()));
    Map<Long, Set<String>> courseTagsByCourseId = loadCourseTagsByCourseId(courseIds);
    List<RoadmapNode> officialNodes = roadmapNodeRepository.findAllOfficialPublicNodes();
    Set<Long> officialNodeIds =
        officialNodes.stream()
            .map(RoadmapNode::getNodeId)
            .collect(Collectors.toCollection(LinkedHashSet::new));
    Map<Long, Set<String>> requiredTagsByNodeId =
        recommendationMetrics.loadRequiredTagsByNodeId(officialNodeIds);

    Map<Long, ResolvedCandidate> candidateByNodeId = new LinkedHashMap<>();
    for (LessonProgress progress : progresses) {
      Long lessonId = progress.getLesson().getLessonId();
      Long courseId = progress.getLesson().getSection().getCourse().getCourseId();
      Set<String> courseTags = courseTagsByCourseId.getOrDefault(courseId, Set.of());
      List<RoadmapNode> candidateNodes =
          resolveCandidateNodes(
              courseId, mappingsByCourseId, officialNodes, requiredTagsByNodeId, courseTags);

      if (candidateNodes.isEmpty()) {
        continue;
      }

      long noteCount =
          timestampNoteRepository.countByUserIdAndLessonLessonIdAndIsDeletedFalse(userId, lessonId);
      long ocrCount = ocrResultRepository.countByUserIdAndLessonLessonId(userId, lessonId);
      long tilCount =
          tilDraftRepository.countByUserIdAndLessonLessonIdAndIsDeletedFalse(userId, lessonId);

      for (RoadmapNode node : candidateNodes) {
        if (isRecentlyHandled(userId, node.getNodeId())) {
          continue;
        }

        Set<String> requiredTags = requiredTagsByNodeId.getOrDefault(node.getNodeId(), Set.of());
        SupplementRecommendationMetrics.Metrics metrics =
            recommendationMetrics.calculate(userSkills, requiredTags);
        ResolvedCandidate candidate =
            ResolvedCandidate.automatic(
                node,
                metrics,
                calculateAutomaticScore(
                    progress, noteCount, ocrCount, tilCount, metrics, courseTags, requiredTags),
                lessonId,
                safeInt(progress.getProgressPercent()),
                noteCount,
                ocrCount,
                tilCount);

        candidateByNodeId.merge(node.getNodeId(), candidate, this::pickHigherScoreCandidate);
      }
    }

    return candidateByNodeId.values().stream()
        .max(
            Comparator.comparingDouble(ResolvedCandidate::score)
                .thenComparing(candidate -> candidate.metrics().missingTagCount())
                .thenComparing(candidate -> candidate.node().getNodeId()))
        .orElseThrow(
            () ->
                new CustomException(
                    ErrorCode.ROADMAP_NODE_NOT_FOUND, "학습 진행 데이터와 연결된 보강 노드를 찾지 못했습니다."));
  }

  private List<RoadmapNode> resolveCandidateNodes(
      Long courseId,
      Map<Long, List<CourseNodeMapping>> mappingsByCourseId,
      List<RoadmapNode> officialNodes,
      Map<Long, Set<String>> requiredTagsByNodeId,
      Set<String> courseTags) {
    List<RoadmapNode> mappedNodes =
        mappingsByCourseId.getOrDefault(courseId, List.of()).stream()
            .map(CourseNodeMapping::getNode)
            .toList();
    if (!mappedNodes.isEmpty()) {
      return mappedNodes;
    }

    // 한글 주석: course_node_mappings가 비어 있는 환경에서도 코스 태그와 공식 노드를 맞춰 자동 추천이 실제로 동작하게 한다.
    List<RoadmapNode> alignedOfficialNodes =
        officialNodes.stream()
            .filter(
                node ->
                    isCourseAlignedNode(
                        requiredTagsByNodeId.getOrDefault(node.getNodeId(), Set.of()), courseTags))
            .toList();
    if (!alignedOfficialNodes.isEmpty()) {
      return alignedOfficialNodes;
    }

    return officialNodes;
  }

  private boolean hasMeaningfulProgress(LessonProgress progress) {
    int progressPercent = safeInt(progress.getProgressPercent());
    int progressSeconds = safeInt(progress.getProgressSeconds());
    return progressPercent < 100 && (progressPercent > 0 || progressSeconds > 0);
  }

  private boolean isCourseAlignedNode(Set<String> requiredTags, Set<String> courseTags) {
    if (requiredTags.isEmpty() || courseTags.isEmpty()) {
      return false;
    }
    return requiredTags.stream().anyMatch(courseTags::contains);
  }

  private boolean isRecentlyHandled(Long userId, Long nodeId) {
    return supplementRecommendationRepository
        .findTopByUserIdAndRoadmapNodeNodeIdOrderByCreatedAtDesc(userId, nodeId)
        .map(
            recommendation ->
                recommendation.getStatus() == RecommendationStatus.PENDING
                    || recommendation.getStatus() == RecommendationStatus.APPROVED)
        .orElse(false);
  }

  private double calculateAutomaticScore(
      LessonProgress progress,
      long noteCount,
      long ocrCount,
      long tilCount,
      SupplementRecommendationMetrics.Metrics metrics,
      Set<String> courseTags,
      Set<String> requiredTags) {
    int progressPercent = safeInt(progress.getProgressPercent());
    int progressSeconds = safeInt(progress.getProgressSeconds());
    long alignedTagCount = requiredTags.stream().filter(courseTags::contains).count();

    double stalledScore =
        ((100.0 - progressPercent) * 0.55) + Math.min(progressSeconds / 60.0, 15.0);
    double activityScore = Math.min((noteCount * 4.0) + (ocrCount * 3.0) + (tilCount * 5.0), 20.0);
    double skillGapScore =
        ((100.0 - metrics.coveragePercent()) * 0.25) + (metrics.missingTagCount() * 8.0);
    double courseAlignmentScore = alignedTagCount * 14.0;
    double noAlignmentPenalty = requiredTags.isEmpty() ? 0.0 : (alignedTagCount == 0 ? 12.0 : 0.0);
    // 운영 설정 가중치는 후보 데이터 자체를 바꾸지 않고 최종 정렬 점수에만 적용한다.
    double activityWeight = recommendationAlgorithmPolicy.recentActivityWeight();
    double skillWeight = recommendationAlgorithmPolicy.skillMatchWeight();
    return stalledScore
        + (activityScore * activityWeight)
        + (skillGapScore * skillWeight)
        + (courseAlignmentScore * skillWeight)
        - noAlignmentPenalty;
  }

  private String resolveReason(ResolvedCandidate candidate, String reason) {
    if (reason != null && !reason.isBlank()) {
      return reason;
    }

    if (!candidate.isAutomatic()) {
      return "취약 영역 보강을 위해 추천한 노드입니다.";
    }

    return "진도 "
        + candidate.progressPercent()
        + "% 강의에서 자동 보강 후보를 생성했습니다. 노트 "
        + candidate.noteCount()
        + "건 OCR "
        + candidate.ocrCount()
        + "건 TIL "
        + candidate.tilCount()
        + "건과 태그 커버리지 "
        + Math.round(candidate.metrics().coveragePercent())
        + "%를 기준으로 선정했습니다.";
  }

  private ResolvedCandidate pickHigherScoreCandidate(
      ResolvedCandidate left, ResolvedCandidate right) {
    return left.score() >= right.score() ? left : right;
  }

  private void createRiskWarningIfNeeded(
      User user, RoadmapNode node, SupplementRecommendationMetrics.Metrics metrics) {
    if (metrics.missingTagCount() > 0 && metrics.coveragePercent() < 50.0) {
      riskWarningRepository.save(
          RiskWarning.builder()
              .user(user)
              .roadmapNode(node)
              .warningType("DIFFICULTY_TOO_HIGH")
              .riskLevel("HIGH")
              .message("현재 보유 태그 대비 난도가 높아 먼저 기초 보강이 필요합니다.")
              .build());
      return;
    }

    if (metrics.missingTagCount() > 0) {
      riskWarningRepository.save(
          RiskWarning.builder()
              .user(user)
              .roadmapNode(node)
              .warningType("PREREQUISITE_MISSING")
              .riskLevel("MEDIUM")
              .message("필수 선수 지식이 일부 비어 있어 선행 학습을 권장합니다.")
              .build());
    }
  }

  private User validateUser(Long userId) {
    return userRepository
        .findById(userId)
        .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
  }

  private Map<Long, Set<String>> loadCourseTagsByCourseId(List<Long> courseIds) {
    Map<Long, Set<String>> courseTagsByCourseId = new LinkedHashMap<>();
    for (Long courseId : courseIds) {
      courseTagsByCourseId.put(
          courseId, new LinkedHashSet<>(courseTagMapRepository.findTagNamesByCourseId(courseId)));
    }
    return courseTagsByCourseId;
  }

  private int safeInt(Integer value) {
    return value == null ? 0 : value;
  }

  private record ResolvedCandidate(
      RoadmapNode node,
      SupplementRecommendationMetrics.Metrics metrics,
      double score,
      Long lessonId,
      int progressPercent,
      long noteCount,
      long ocrCount,
      long tilCount,
      boolean automatic) {
    private static ResolvedCandidate manual(
        RoadmapNode node, SupplementRecommendationMetrics.Metrics metrics) {
      return new ResolvedCandidate(node, metrics, 0.0, null, 0, 0, 0, 0, false);
    }

    private static ResolvedCandidate automatic(
        RoadmapNode node,
        SupplementRecommendationMetrics.Metrics metrics,
        double score,
        Long lessonId,
        int progressPercent,
        long noteCount,
        long ocrCount,
        long tilCount) {
      return new ResolvedCandidate(
          node, metrics, score, lessonId, progressPercent, noteCount, ocrCount, tilCount, true);
    }

    private boolean isAutomatic() {
      return automatic;
    }
  }
}
