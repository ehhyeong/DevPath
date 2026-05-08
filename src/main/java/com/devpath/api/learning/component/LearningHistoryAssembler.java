package com.devpath.api.learning.component;

import com.devpath.api.learning.dto.LearningHistoryResponse;
import com.devpath.api.learning.dto.SupplementRecommendationResponse;
import com.devpath.api.learning.dto.TilResponse;
import com.devpath.api.learning.dto.WeaknessAnalysisResponse;
import com.devpath.api.learning.service.SupplementRecommendationService;
import com.devpath.api.learning.service.TilService;
import com.devpath.api.learning.service.WeaknessAnalysisService;
import com.devpath.api.proof.dto.ProofCardResponse;
import com.devpath.api.proof.service.ProofCardService;
import com.devpath.domain.learning.entity.Submission;
import com.devpath.domain.learning.entity.SubmissionStatus;
import com.devpath.domain.learning.entity.TilDraftStatus;
import com.devpath.domain.learning.entity.clearance.ClearanceStatus;
import com.devpath.domain.learning.repository.SubmissionRepository;
import com.devpath.domain.learning.repository.clearance.NodeClearanceRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LearningHistoryAssembler {

  private final NodeClearanceRepository nodeClearanceRepository;
  private final SubmissionRepository submissionRepository;
  private final TilService tilService;
  private final WeaknessAnalysisService weaknessAnalysisService;
  private final SupplementRecommendationService supplementRecommendationService;
  private final ProofCardService proofCardService;

  public LearningHistoryResponse.Detail assemble(Long userId) {
    List<LearningHistoryResponse.CompletedNodeDetail> completedNodes =
        assembleCompletedNodes(userId);
    List<LearningHistoryResponse.AssignmentDetail> assignments = assembleAssignments(userId);
    List<TilResponse> tils = assembleTils(userId);
    List<ProofCardResponse.Summary> proofCards = proofCardService.getProofCardsForHistory(userId);
    List<SupplementRecommendationResponse> supplementRecommendations =
        supplementRecommendationService.getRecommendationsForHistory(userId);
    WeaknessAnalysisResponse latestWeaknessAnalysis =
        weaknessAnalysisService.getLatestAnalysisForHistory(userId);

    return LearningHistoryResponse.Detail.builder()
        .summary(
            buildSummary(completedNodes, assignments, tils, proofCards, supplementRecommendations))
        .completedNodes(completedNodes)
        .assignments(assignments)
        .tils(tils)
        .proofCards(proofCards)
        .supplementRecommendations(supplementRecommendations)
        .latestWeaknessAnalysis(latestWeaknessAnalysis)
        .build();
  }

  public LearningHistoryResponse.Summary assembleSummary(Long userId) {
    List<LearningHistoryResponse.CompletedNodeDetail> completedNodes =
        assembleCompletedNodes(userId);
    List<LearningHistoryResponse.AssignmentDetail> assignments = assembleAssignments(userId);
    List<TilResponse> tils = assembleTils(userId);
    List<ProofCardResponse.Summary> proofCards = proofCardService.getProofCardsForHistory(userId);
    List<SupplementRecommendationResponse> supplementRecommendations =
        supplementRecommendationService.getRecommendationsForHistory(userId);

    return buildSummary(completedNodes, assignments, tils, proofCards, supplementRecommendations);
  }

  public List<LearningHistoryResponse.CompletedNodeDetail> assembleCompletedNodes(Long userId) {
    return nodeClearanceRepository
        .findAllByUserIdAndClearanceStatusOrderByClearedAtDesc(userId, ClearanceStatus.CLEARED)
        .stream()
        .map(
            nodeClearance ->
                LearningHistoryResponse.CompletedNodeDetail.builder()
                    .nodeId(nodeClearance.getNode().getNodeId())
                    .nodeTitle(nodeClearance.getNode().getTitle())
                    .clearedAt(nodeClearance.getClearedAt())
                    .proofIssued(Boolean.TRUE.equals(nodeClearance.getProofEligible()))
                    .build())
        .toList();
  }

  public List<LearningHistoryResponse.AssignmentDetail> assembleAssignments(Long userId) {
    return submissionRepository
        .findAllByLearnerIdAndIsDeletedFalseOrderBySubmittedAtDesc(userId)
        .stream()
        .map(this::toAssignmentDetail)
        .toList();
  }

  public List<TilResponse> assembleTils(Long userId) {
    return tilService.getTilListForHistory(userId);
  }

  private LearningHistoryResponse.Summary buildSummary(
      List<LearningHistoryResponse.CompletedNodeDetail> completedNodes,
      List<LearningHistoryResponse.AssignmentDetail> assignments,
      List<TilResponse> tils,
      List<ProofCardResponse.Summary> proofCards,
      List<SupplementRecommendationResponse> supplementRecommendations) {
    long publishedTilCount =
        tils.stream().filter(til -> TilDraftStatus.PUBLISHED.equals(til.getStatus())).count();

    long passedAssignmentCount =
        assignments.stream()
            .filter(
                assignment ->
                    SubmissionStatus.GRADED.name().equals(assignment.getSubmissionStatus()))
            .filter(
                assignment -> assignment.getTotalScore() != null && assignment.getTotalScore() > 0)
            .count();

    return LearningHistoryResponse.Summary.builder()
        .completedNodeCount((long) completedNodes.size())
        .proofCardCount((long) proofCards.size())
        .tilCount((long) tils.size())
        .publishedTilCount(publishedTilCount)
        .assignmentSubmissionCount((long) assignments.size())
        .passedAssignmentCount(passedAssignmentCount)
        .supplementRecommendationCount((long) supplementRecommendations.size())
        .build();
  }

  private LearningHistoryResponse.AssignmentDetail toAssignmentDetail(Submission submission) {
    return LearningHistoryResponse.AssignmentDetail.builder()
        .submissionId(submission.getId())
        .assignmentId(submission.getAssignment().getId())
        .nodeId(submission.getAssignment().getRoadmapNode().getNodeId())
        .nodeTitle(submission.getAssignment().getRoadmapNode().getTitle())
        .assignmentTitle(submission.getAssignment().getTitle())
        .submissionStatus(submission.getSubmissionStatus().name())
        .totalScore(submission.getTotalScore())
        .submittedAt(submission.getSubmittedAt())
        .build();
  }
}
