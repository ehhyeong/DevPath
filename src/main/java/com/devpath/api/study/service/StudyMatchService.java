package com.devpath.api.study.service;

import com.devpath.api.study.dto.StudyMatchRecommendationResponse;
import com.devpath.api.study.dto.StudyMatchResponse;
import com.devpath.domain.learning.entity.clearance.NodeClearance;
import com.devpath.domain.learning.repository.LessonProgressRepository;
import com.devpath.domain.learning.repository.clearance.NodeClearanceRepository;
import com.devpath.domain.planner.entity.LearnerGoal;
import com.devpath.domain.planner.entity.PlannerGoalType;
import com.devpath.domain.planner.entity.Streak;
import com.devpath.domain.planner.repository.LearnerGoalRepository;
import com.devpath.domain.planner.repository.StreakRepository;
import com.devpath.domain.study.repository.StudyMatchRepository;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StudyMatchService {

  private static final int MAX_RECOMMENDATION_COUNT = 10;
  private static final int MAX_ACTIVE_NODE_WINDOW = 5;
  private static final int NODE_SCORE_MAX = 50;
  private static final int GOAL_SCORE_MAX = 25;
  private static final int ACTIVITY_SCORE_MAX = 10;
  private static final int STREAK_SCORE_MAX = 15;

  private final StudyMatchRepository studyMatchRepository;
  private final NodeClearanceRepository nodeClearanceRepository;
  private final LearnerGoalRepository learnerGoalRepository;
  private final LessonProgressRepository lessonProgressRepository;
  private final StreakRepository streakRepository;

  public List<StudyMatchResponse> getMyMatches(Long learnerId) {
    return studyMatchRepository.findMyMatches(learnerId).stream()
        .map(StudyMatchResponse::from)
        .toList();
  }

  public List<StudyMatchRecommendationResponse> getRecommendations(Long learnerId) {
    List<NodeClearance> myInProgressClearances =
        nodeClearanceRepository.findInProgressClearancesByUserId(learnerId);
    if (myInProgressClearances.isEmpty()) {
      return List.of();
    }

    List<Long> myPriorityNodeIds =
        myInProgressClearances.stream()
            .map(clearance -> clearance.getNode().getNodeId())
            .distinct()
            .limit(MAX_ACTIVE_NODE_WINDOW)
            .toList();
    if (myPriorityNodeIds.isEmpty()) {
      return List.of();
    }

    List<NodeClearance> candidateClearances =
        nodeClearanceRepository.findCandidateInProgressClearances(learnerId, myPriorityNodeIds);
    if (candidateClearances.isEmpty()) {
      return List.of();
    }

    Map<Long, List<NodeClearance>> candidateClearanceMap =
        candidateClearances.stream()
            .collect(Collectors.groupingBy(clearance -> clearance.getUser().getId()));

    List<Long> candidateLearnerIds = candidateClearanceMap.keySet().stream().toList();
    List<LearnerGoal> myGoals = learnerGoalRepository.findAllByLearnerIdAndIsActiveTrue(learnerId);

    Map<Long, List<LearnerGoal>> candidateGoalMap =
        learnerGoalRepository.findAllByLearnerIdInAndIsActiveTrue(candidateLearnerIds).stream()
            .collect(Collectors.groupingBy(LearnerGoal::getLearnerId));

    Map<Long, Integer> candidateStreakMap =
        streakRepository.findAllByLearnerIdIn(candidateLearnerIds).stream()
            .collect(Collectors.toMap(Streak::getLearnerId, Streak::getCurrentStreak));

    LocalDateTime recentActivityCutoff = LocalDateTime.now().minusDays(7);

    return candidateClearanceMap.entrySet().stream()
        .map(
            entry ->
                buildRecommendation(
                    learnerId,
                    myPriorityNodeIds,
                    myGoals,
                    recentActivityCutoff,
                    candidateGoalMap,
                    candidateStreakMap,
                    entry.getKey(),
                    entry.getValue()))
        .flatMap(Optional::stream)
        .sorted(Comparator.comparing(StudyMatchRecommendationResponse::getMatchScore).reversed())
        .limit(MAX_RECOMMENDATION_COUNT)
        .toList();
  }

  private Optional<StudyMatchRecommendationResponse> buildRecommendation(
      Long learnerId,
      List<Long> myPriorityNodeIds,
      List<LearnerGoal> myGoals,
      LocalDateTime recentActivityCutoff,
      Map<Long, List<LearnerGoal>> candidateGoalMap,
      Map<Long, Integer> candidateStreakMap,
      Long candidateLearnerId,
      List<NodeClearance> candidateSharedClearances) {
    List<Long> sharedNodeIds =
        candidateSharedClearances.stream()
            .map(clearance -> clearance.getNode().getNodeId())
            .distinct()
            .toList();
    if (sharedNodeIds.isEmpty()) {
      return Optional.empty();
    }

    if (studyMatchRepository.existsActiveMatchBetweenUsersForNodes(
        learnerId, candidateLearnerId, sharedNodeIds)) {
      return Optional.empty();
    }

    Long primarySharedNodeId = resolvePrimarySharedNodeId(myPriorityNodeIds, sharedNodeIds);
    int nodeScore = calculateNodeScore(myPriorityNodeIds, sharedNodeIds, primarySharedNodeId);
    int goalScore =
        calculateGoalSimilarityScore(
            myGoals, candidateGoalMap.getOrDefault(candidateLearnerId, List.of()));
    int activityScore =
        calculateRecentActivityScore(
            lessonProgressRepository.countByUserIdAndLastWatchedAtAfter(
                candidateLearnerId, recentActivityCutoff));
    int streakScore = calculateStreakScore(candidateStreakMap.getOrDefault(candidateLearnerId, 0));
    int totalScore = Math.min(100, nodeScore + goalScore + activityScore + streakScore);

    String maskedName = maskName(candidateSharedClearances.get(0).getUser().getName());

    return Optional.of(
        StudyMatchRecommendationResponse.builder()
            .recommendedLearnerId(candidateLearnerId)
            .maskedName(maskedName)
            .sharedNodeId(primarySharedNodeId)
            .matchScore(totalScore)
            .build());
  }

  private Long resolvePrimarySharedNodeId(List<Long> myPriorityNodeIds, List<Long> sharedNodeIds) {
    for (Long nodeId : myPriorityNodeIds) {
      if (sharedNodeIds.contains(nodeId)) {
        return nodeId;
      }
    }
    return sharedNodeIds.get(0);
  }

  private int calculateNodeScore(
      List<Long> myPriorityNodeIds, List<Long> sharedNodeIds, Long primarySharedNodeId) {
    int score = 30;
    int sharedNodeBonus = Math.min(10, Math.max(0, sharedNodeIds.size() - 1) * 5);
    score += sharedNodeBonus;

    if (!myPriorityNodeIds.isEmpty() && myPriorityNodeIds.get(0).equals(primarySharedNodeId)) {
      score += 10;
    }

    int index = myPriorityNodeIds.indexOf(primarySharedNodeId);
    if (index >= 0 && index <= 2) {
      score += (3 - index) * 2;
    }

    return Math.min(NODE_SCORE_MAX, score);
  }

  private int calculateGoalSimilarityScore(
      List<LearnerGoal> myGoals, List<LearnerGoal> candidateGoals) {
    if (myGoals.isEmpty() || candidateGoals.isEmpty()) {
      return 0;
    }

    Map<PlannerGoalType, Integer> myGoalMap = toGoalMap(myGoals);
    Map<PlannerGoalType, Integer> candidateGoalMap = toGoalMap(candidateGoals);

    Set<PlannerGoalType> sharedGoalTypes =
        myGoalMap.keySet().stream()
            .filter(candidateGoalMap::containsKey)
            .collect(Collectors.toSet());
    if (sharedGoalTypes.isEmpty()) {
      return 0;
    }

    int sameGoalTypeScore = Math.min(15, sharedGoalTypes.size() * 7);
    int targetClosenessScore =
        sharedGoalTypes.stream()
            .mapToInt(
                goalType -> {
                  int myTarget = myGoalMap.get(goalType);
                  int candidateTarget = candidateGoalMap.get(goalType);
                  int diff = Math.abs(myTarget - candidateTarget);
                  return Math.max(0, 10 - Math.min(10, diff));
                })
            .max()
            .orElse(0);

    return Math.min(GOAL_SCORE_MAX, sameGoalTypeScore + targetClosenessScore);
  }

  private Map<PlannerGoalType, Integer> toGoalMap(List<LearnerGoal> goals) {
    Map<PlannerGoalType, Integer> goalMap = new EnumMap<>(PlannerGoalType.class);
    for (LearnerGoal goal : goals) {
      goalMap.merge(goal.getGoalType(), goal.getTargetValue(), Math::max);
    }
    return goalMap;
  }

  private int calculateRecentActivityScore(long recentActivityCount) {
    if (recentActivityCount <= 0) {
      return 0;
    }
    return (int) Math.min(ACTIVITY_SCORE_MAX, recentActivityCount * 2);
  }

  private int calculateStreakScore(int currentStreak) {
    if (currentStreak <= 0) {
      return 0;
    }
    return Math.min(STREAK_SCORE_MAX, currentStreak * 2);
  }

  private String maskName(String name) {
    if (name == null || name.isBlank()) {
      return "anon";
    }
    if (name.length() == 1) {
      return name.charAt(0) + "*";
    }
    if (name.length() == 2) {
      return name.charAt(0) + "*";
    }
    return name.charAt(0) + "*" + name.charAt(name.length() - 1);
  }
}
