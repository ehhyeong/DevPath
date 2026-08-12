package com.devpath.api.recommendation.service;

import com.devpath.domain.learning.entity.LessonProgress;
import com.devpath.domain.learning.entity.TilDraftStatus;
import com.devpath.domain.learning.repository.LessonProgressRepository;
import com.devpath.domain.learning.repository.TilDraftRepository;
import com.devpath.domain.learning.repository.TimestampNoteRepository;
import com.devpath.domain.learning.repository.ocr.OcrResultRepository;
import com.devpath.domain.learning.service.LearningAutomationPolicyService;
import com.devpath.domain.roadmap.entity.CustomRoadmap;
import com.devpath.domain.roadmap.entity.NodeRecommendation;
import com.devpath.domain.roadmap.entity.NodeStatus;
import com.devpath.domain.roadmap.entity.RoadmapNode;
import com.devpath.domain.roadmap.repository.CustomRoadmapNodeRepository;
import com.devpath.domain.roadmap.repository.CustomRoadmapRepository;
import com.devpath.domain.roadmap.repository.NodeRequiredTagRepository;
import com.devpath.domain.user.repository.UserTechStackRepository;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class NodeRecommendationPlanner {

  private final NodeRequiredTagRepository nodeRequiredTagRepository;
  private final UserTechStackRepository userTechStackRepository;
  private final CustomRoadmapRepository customRoadmapRepository;
  private final CustomRoadmapNodeRepository customRoadmapNodeRepository;
  private final LessonProgressRepository lessonProgressRepository;
  private final TimestampNoteRepository timestampNoteRepository;
  private final TilDraftRepository tilDraftRepository;
  private final OcrResultRepository ocrResultRepository;
  private final LearningAutomationPolicyService learningAutomationPolicyService;

  RecommendationPlan plan(Long userId, Long roadmapId, List<RoadmapNode> roadmapNodes) {
    Set<String> userSkills =
        new LinkedHashSet<>(userTechStackRepository.findTagNamesByUserId(userId));
    Set<Long> completedNodeIds = getCompletedNodeIds(userId, roadmapId);
    LearningSignalSnapshot signals = buildLearningSignalSnapshot(userId);
    Map<Long, List<String>> requiredTagsByNodeId = getRequiredTagsByNodeId(roadmapNodes);

    List<RecommendationCandidate> candidates =
        roadmapNodes.stream()
            .filter(node -> !completedNodeIds.contains(node.getNodeId()))
            .map(
                node ->
                    toCandidate(
                        node,
                        requiredTagsByNodeId.getOrDefault(node.getNodeId(), List.of()),
                        userSkills,
                        signals))
            .toList();

    if (candidates.isEmpty()) {
      return new RecommendationPlan(List.of(), signals.averageProgressPercent());
    }

    RecommendationCandidate remedialCandidate =
        candidates.stream()
            .filter(
                candidate -> candidate.missingCount() > 0 || candidate.coveragePercent() < 100.0)
            .sorted(remedialComparator())
            .findFirst()
            .orElse(null);

    RecommendationCandidate advancedCandidate =
        signals.isReadyForAdvanced()
            ? candidates.stream()
                .filter(
                    candidate ->
                        candidate.coveragePercent()
                            >= learningAutomationPolicyService.getTagMatchThreshold() * 100.0)
                .filter(candidate -> isDifferentNode(candidate, remedialCandidate))
                .sorted(advancedComparator())
                .findFirst()
                .orElse(null)
            : null;

    RecommendationCandidate optionalCandidate =
        signals.hasLearningFlow()
            ? candidates.stream()
                .filter(candidate -> isDifferentNode(candidate, remedialCandidate))
                .filter(candidate -> isDifferentNode(candidate, advancedCandidate))
                .sorted(optionalComparator())
                .findFirst()
                .orElse(null)
            : null;

    if (remedialCandidate == null && advancedCandidate == null && optionalCandidate == null) {
      optionalCandidate = candidates.stream().sorted(optionalComparator()).findFirst().orElse(null);
    }

    List<PlannedRecommendation> recommendations = new ArrayList<>();
    if (remedialCandidate != null) {
      recommendations.add(
          toPlannedRecommendation(
              remedialCandidate,
              NodeRecommendation.RecommendationType.REMEDIAL,
              buildRemedialReason(remedialCandidate)));
    }
    if (advancedCandidate != null) {
      recommendations.add(
          toPlannedRecommendation(
              advancedCandidate,
              NodeRecommendation.RecommendationType.ADVANCED,
              buildAdvancedReason(advancedCandidate)));
    } else if (optionalCandidate != null) {
      recommendations.add(
          toPlannedRecommendation(
              optionalCandidate,
              NodeRecommendation.RecommendationType.OPTIONAL,
              "현재 태그와 일부 맞아 추가 학습 후보로 추천합니다."));
    }

    return new RecommendationPlan(List.copyOf(recommendations), signals.averageProgressPercent());
  }

  private boolean isDifferentNode(
      RecommendationCandidate candidate, RecommendationCandidate selectedCandidate) {
    return selectedCandidate == null
        || !candidate.node().getNodeId().equals(selectedCandidate.node().getNodeId());
  }

  private Set<Long> getCompletedNodeIds(Long userId, Long roadmapId) {
    return customRoadmapRepository
        .findByUserIdAndOriginalRoadmapRoadmapId(userId, roadmapId)
        .map(this::getCompletedNodeIds)
        .orElse(Set.of());
  }

  private Set<Long> getCompletedNodeIds(CustomRoadmap customRoadmap) {
    return customRoadmapNodeRepository.findAllByCustomRoadmap(customRoadmap).stream()
        .filter(customNode -> customNode.getStatus() == NodeStatus.COMPLETED)
        .map(customNode -> customNode.getOriginalNode().getNodeId())
        .collect(java.util.stream.Collectors.toSet());
  }

  private LearningSignalSnapshot buildLearningSignalSnapshot(Long userId) {
    List<LessonProgress> progresses = lessonProgressRepository.findAllByUserId(userId);
    int trackedLessons = progresses.size();
    int averageProgressPercent =
        trackedLessons == 0
            ? 0
            : (int)
                Math.round(
                    progresses.stream()
                        .mapToInt(progress -> safeInt(progress.getProgressPercent()))
                        .average()
                        .orElse(0.0));
    int totalProgressSeconds =
        progresses.stream().mapToInt(progress -> safeInt(progress.getProgressSeconds())).sum();
    long noteCount = timestampNoteRepository.countByUserIdAndIsDeletedFalse(userId);
    long tilCount = tilDraftRepository.countByUserIdAndIsDeletedFalse(userId);
    long publishedTilCount =
        tilDraftRepository.countByUserIdAndStatusAndIsDeletedFalse(
            userId, TilDraftStatus.PUBLISHED);
    long ocrCount = ocrResultRepository.countByUserId(userId);

    double learningMomentum =
        Math.min(
            100.0,
            (averageProgressPercent * 0.55)
                + Math.min(noteCount, 5) * 6
                + Math.min(ocrCount, 5) * 4
                + Math.min(tilCount, 3) * 7
                + Math.min(publishedTilCount, 2) * 10
                + Math.min(totalProgressSeconds / 120.0, 20.0));

    return new LearningSignalSnapshot(
        trackedLessons,
        averageProgressPercent,
        totalProgressSeconds,
        noteCount,
        tilCount,
        ocrCount,
        learningMomentum);
  }

  private Map<Long, List<String>> getRequiredTagsByNodeId(List<RoadmapNode> roadmapNodes) {
    List<Long> nodeIds = roadmapNodes.stream().map(RoadmapNode::getNodeId).toList();
    Map<Long, Set<String>> requiredTagsByNodeId = new LinkedHashMap<>();
    for (NodeRequiredTagRepository.NodeRequiredTagNameProjection row :
        nodeRequiredTagRepository.findTagNamesByNodeIds(nodeIds)) {
      requiredTagsByNodeId
          .computeIfAbsent(row.getNodeId(), ignored -> new LinkedHashSet<>())
          .add(row.getTagName());
    }

    Map<Long, List<String>> result = new LinkedHashMap<>();
    for (Long nodeId : nodeIds) {
      result.put(
          nodeId, List.copyOf(requiredTagsByNodeId.getOrDefault(nodeId, new LinkedHashSet<>())));
    }
    return result;
  }

  private RecommendationCandidate toCandidate(
      RoadmapNode node,
      List<String> requiredTags,
      Set<String> userSkills,
      LearningSignalSnapshot signals) {
    long matchedCount = requiredTags.stream().filter(userSkills::contains).count();
    int requiredCount = requiredTags.size();
    int missingCount = requiredCount - (int) matchedCount;
    double coveragePercent = requiredCount == 0 ? 100.0 : (matchedCount * 100.0) / requiredCount;
    double remedialScore =
        ((100.0 - coveragePercent) * 0.60)
            + ((100.0 - signals.learningMomentum()) * 0.25)
            + (missingCount * 5.0);
    double advancedScore =
        (coveragePercent * 0.60) + (signals.learningMomentum() * 0.40) - (missingCount * 4.0);
    double optionalScore =
        (coveragePercent * 0.70) + (signals.learningMomentum() * 0.30) - (missingCount * 2.0);

    return new RecommendationCandidate(
        node,
        requiredTags,
        (int) matchedCount,
        missingCount,
        coveragePercent,
        remedialScore,
        advancedScore,
        optionalScore);
  }

  private Comparator<RecommendationCandidate> remedialComparator() {
    return Comparator.comparingDouble(RecommendationCandidate::remedialScore)
        .reversed()
        .thenComparing(Comparator.comparingInt(RecommendationCandidate::missingCount).reversed())
        .thenComparingDouble(RecommendationCandidate::coveragePercent)
        .thenComparing(candidate -> candidate.node().getSortOrder())
        .thenComparing(candidate -> candidate.node().getNodeId());
  }

  private Comparator<RecommendationCandidate> advancedComparator() {
    return Comparator.comparingDouble(RecommendationCandidate::advancedScore)
        .reversed()
        .thenComparing(
            Comparator.comparingDouble(RecommendationCandidate::coveragePercent).reversed())
        .thenComparing(candidate -> candidate.node().getSortOrder())
        .thenComparing(candidate -> candidate.node().getNodeId());
  }

  private Comparator<RecommendationCandidate> optionalComparator() {
    return Comparator.comparingDouble(RecommendationCandidate::optionalScore)
        .reversed()
        .thenComparing(
            Comparator.comparingDouble(RecommendationCandidate::coveragePercent).reversed())
        .thenComparing(candidate -> candidate.node().getSortOrder())
        .thenComparing(candidate -> candidate.node().getNodeId());
  }

  private PlannedRecommendation toPlannedRecommendation(
      RecommendationCandidate candidate,
      NodeRecommendation.RecommendationType type,
      String reason) {
    return new PlannedRecommendation(
        candidate.node(), type, reason, candidate.coveragePercent(), candidate.missingCount());
  }

  private String buildRemedialReason(RecommendationCandidate candidate) {
    if (candidate.requiredTags().isEmpty()) {
      return "기초 진입 노드라서 바로 시작해도 좋습니다.";
    }
    return "필수 태그 "
        + candidate.requiredTags().size()
        + "개 중 "
        + candidate.matchedCount()
        + "개를 보유해 부족한 역량을 보완하기 좋습니다.";
  }

  private String buildAdvancedReason(RecommendationCandidate candidate) {
    if (candidate.requiredTags().isEmpty()) {
      return "선행 태그 없이 바로 시작할 수 있는 노드입니다.";
    }
    return "현재 보유 태그로 바로 학습할 수 있는 다음 단계 노드입니다.";
  }

  private int safeInt(Integer value) {
    return value == null ? 0 : value;
  }

  record RecommendationPlan(
      List<PlannedRecommendation> recommendations, int averageProgressPercent) {}

  record PlannedRecommendation(
      RoadmapNode node,
      NodeRecommendation.RecommendationType type,
      String reason,
      double coveragePercent,
      int missingCount) {}

  private record RecommendationCandidate(
      RoadmapNode node,
      List<String> requiredTags,
      int matchedCount,
      int missingCount,
      double coveragePercent,
      double remedialScore,
      double advancedScore,
      double optionalScore) {}

  private record LearningSignalSnapshot(
      int trackedLessons,
      int averageProgressPercent,
      int totalProgressSeconds,
      long noteCount,
      long tilCount,
      long ocrCount,
      double learningMomentum) {
    boolean isReadyForAdvanced() {
      return learningMomentum >= 55.0
          && averageProgressPercent >= 45
          && noteCount > 0
          && (ocrCount > 0 || tilCount > 0);
    }

    boolean hasLearningFlow() {
      return trackedLessons > 0
          && (totalProgressSeconds >= 300 || noteCount > 0 || ocrCount > 0 || tilCount > 0);
    }
  }
}
