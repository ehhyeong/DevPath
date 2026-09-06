package com.devpath.api.analytics.service;

import com.devpath.api.analytics.dto.InstructorAnalyticsAssignmentResponse;
import com.devpath.domain.analytics.service.InstructorAnalyticsMetrics;
import com.devpath.domain.learning.entity.Submission;
import com.devpath.domain.learning.entity.SubmissionStatus;
import com.devpath.domain.learning.repository.SubmissionRepository;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class InstructorAssignmentAnalyticsService {

  private final SubmissionRepository submissionRepository;
  private final InstructorAnalyticsMetrics metrics;
  private final InstructorAnalyticsScope analyticsScope;

  public InstructorAnalyticsAssignmentResponse.Detail getAssignmentStats(Long instructorId) {
    Set<Long> nodeIds = analyticsScope.loadNodeIds(instructorId);
    if (nodeIds.isEmpty()) {
      return emptyDetail();
    }

    List<Submission> submissions =
        submissionRepository
            .findAllByAssignmentRoadmapNodeNodeIdInAndIsDeletedFalseOrderBySubmittedAtDesc(nodeIds);
    long gradedCount =
        submissions.stream()
            .filter(submission -> SubmissionStatus.GRADED.equals(submission.getSubmissionStatus()))
            .count();
    double averageScore =
        metrics.averageIntegers(
            submissions.stream()
                .map(Submission::getTotalScore)
                .filter(score -> score != null)
                .toList(),
            2);
    long passedCount =
        submissions.stream()
            .filter(submission -> SubmissionStatus.GRADED.equals(submission.getSubmissionStatus()))
            .filter(
                submission -> submission.getTotalScore() != null && submission.getTotalScore() > 0)
            .count();
    Map<Long, List<Submission>> submissionMap =
        submissions.stream()
            .collect(
                Collectors.groupingBy(
                    submission -> submission.getAssignment().getRoadmapNode().getNodeId()));

    List<InstructorAnalyticsAssignmentResponse.NodeAssignmentItem> items =
        submissionMap.entrySet().stream()
            .map(
                entry -> {
                  List<Submission> nodeSubmissions = entry.getValue();
                  return InstructorAnalyticsAssignmentResponse.NodeAssignmentItem.builder()
                      .nodeId(entry.getKey())
                      .nodeTitle(
                          nodeSubmissions.getFirst().getAssignment().getRoadmapNode().getTitle())
                      .submissionCount((long) nodeSubmissions.size())
                      .gradedCount(
                          nodeSubmissions.stream()
                              .filter(
                                  submission ->
                                      SubmissionStatus.GRADED.equals(
                                          submission.getSubmissionStatus()))
                              .count())
                      .averageScore(
                          metrics.averageIntegers(
                              nodeSubmissions.stream()
                                  .map(Submission::getTotalScore)
                                  .filter(score -> score != null)
                                  .toList(),
                              2))
                      .build();
                })
            .sorted(
                Comparator.comparing(
                        InstructorAnalyticsAssignmentResponse.NodeAssignmentItem
                            ::getSubmissionCount)
                    .reversed())
            .toList();

    return InstructorAnalyticsAssignmentResponse.Detail.builder()
        .summary(
            InstructorAnalyticsAssignmentResponse.Summary.builder()
                .totalSubmissions((long) submissions.size())
                .gradedSubmissions(gradedCount)
                .averageScore(averageScore)
                .passRate(metrics.percent(passedCount, submissions.size(), 2))
                .build())
        .items(items)
        .build();
  }

  private InstructorAnalyticsAssignmentResponse.Detail emptyDetail() {
    return InstructorAnalyticsAssignmentResponse.Detail.builder()
        .summary(
            InstructorAnalyticsAssignmentResponse.Summary.builder()
                .totalSubmissions(0L)
                .gradedSubmissions(0L)
                .averageScore(0.0)
                .passRate(0.0)
                .build())
        .items(List.of())
        .build();
  }
}
