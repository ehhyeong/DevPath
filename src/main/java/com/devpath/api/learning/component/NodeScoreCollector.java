package com.devpath.api.learning.component;

import com.devpath.domain.learning.entity.SubmissionStatus;
import com.devpath.domain.learning.repository.QuizAttemptRepository;
import com.devpath.domain.learning.repository.SubmissionRepository;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

// 노드들의 퀴즈/과제 채점 성적을 0~100 백분율로 수집한다(채용분석·진단 추천 공통 사용).
@Component
@RequiredArgsConstructor
public class NodeScoreCollector {

  private final QuizAttemptRepository quizAttemptRepository;
  private final SubmissionRepository submissionRepository;

  // 노드별 퀴즈 최고 응시 성적 + 과제 최신 채점 성적을 백분율 목록으로 수집한다.
  public List<BigDecimal> collectScores(List<Long> nodeIds, Long userId) {
    if (nodeIds == null || nodeIds.isEmpty()) {
      return List.of();
    }

    List<BigDecimal> scores = new ArrayList<>();
    scores.addAll(collectQuizScores(nodeIds, userId));
    scores.addAll(collectAssignmentScores(nodeIds, userId));
    return scores;
  }

  // 노드별 퀴즈 최고 응시 성적을 백분율로 수집한다.
  private List<BigDecimal> collectQuizScores(List<Long> nodeIds, Long userId) {
    Map<Long, BigDecimal> bestByQuiz = new LinkedHashMap<>();

    quizAttemptRepository
        .findAllByQuizRoadmapNodeNodeIdInAndIsDeletedFalseOrderByCreatedAtDesc(nodeIds)
        .forEach(
            attempt -> {
              if (!userId.equals(attempt.getLearner().getId())
                  || attempt.getCompletedAt() == null
                  || attempt.getMaxScore() == null
                  || attempt.getMaxScore() <= 0) {
                return;
              }

              BigDecimal percent = toPercent(attempt.getScore(), attempt.getMaxScore());
              bestByQuiz.merge(attempt.getQuiz().getId(), percent, BigDecimal::max);
            });

    return new ArrayList<>(bestByQuiz.values());
  }

  // 노드별 과제 최신 채점 성적을 백분율로 수집한다.
  private List<BigDecimal> collectAssignmentScores(List<Long> nodeIds, Long userId) {
    Map<Long, BigDecimal> latestByAssignment = new LinkedHashMap<>();

    submissionRepository
        .findAllByAssignmentRoadmapNodeNodeIdInAndIsDeletedFalseOrderBySubmittedAtDesc(nodeIds)
        .forEach(
            submission -> {
              if (!userId.equals(submission.getLearner().getId())
                  || !SubmissionStatus.GRADED.equals(submission.getSubmissionStatus())
                  || submission.getTotalScore() == null) {
                return;
              }

              Integer maxScore = submission.getAssignment().getTotalScore();
              if (maxScore == null || maxScore <= 0) {
                return;
              }

              latestByAssignment.putIfAbsent(
                  submission.getAssignment().getId(),
                  toPercent(submission.getTotalScore(), maxScore));
            });

    return new ArrayList<>(latestByAssignment.values());
  }

  // 획득 점수를 만점 대비 0~100 백분율로 변환한다.
  private BigDecimal toPercent(int score, int maxScore) {
    BigDecimal percent = BigDecimal.valueOf((double) score * 100.0 / (double) maxScore);
    return percent.max(BigDecimal.ZERO).min(BigDecimal.valueOf(100));
  }
}