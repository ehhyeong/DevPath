package com.devpath.api.learning.service;

import com.devpath.api.learning.component.NodeClearanceEvaluator;
import com.devpath.api.learning.dto.NodeClearanceRequest;
import com.devpath.api.learning.dto.NodeClearanceResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.learning.entity.clearance.NodeClearance;
import com.devpath.domain.learning.entity.clearance.NodeClearanceReason;
import com.devpath.domain.learning.repository.clearance.NodeClearanceReasonRepository;
import com.devpath.domain.learning.repository.clearance.NodeClearanceRepository;
import com.devpath.domain.roadmap.entity.RoadmapNode;
import com.devpath.domain.roadmap.repository.RoadmapNodeRepository;
import com.devpath.domain.roadmap.repository.RoadmapRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class NodeClearanceService {

    private final NodeClearanceRepository nodeClearanceRepository;
    private final NodeClearanceReasonRepository nodeClearanceReasonRepository;
    private final NodeClearanceEvaluator nodeClearanceEvaluator;
    private final UserRepository userRepository;
    private final RoadmapRepository roadmapRepository;
    private final RoadmapNodeRepository roadmapNodeRepository;

    @Transactional
    public List<NodeClearanceResponse.Detail> recalculate(Long userId, NodeClearanceRequest.Recalculate request) {
        validateUser(userId);
        roadmapRepository.findByRoadmapIdAndIsDeletedFalse(request.getRoadmapId())
            .orElseThrow(() -> new CustomException(ErrorCode.ROADMAP_NOT_FOUND));

        List<RoadmapNode> nodes = roadmapNodeRepository.findAllByRoadmapRoadmapId(request.getRoadmapId())
            .stream()
            .sorted(
                Comparator.comparing(RoadmapNode::getSortOrder, Comparator.nullsLast(Integer::compareTo))
                    .thenComparing(RoadmapNode::getNodeId)
            )
            .toList();

        if (request.getNodeIds() == null || request.getNodeIds().isEmpty()) {
            return nodes.stream()
                .map(node -> synchronizeNodeClearance(userId, node.getNodeId()))
                .toList();
        }

        Set<Long> targetNodeIds = request.getNodeIds().stream().collect(Collectors.toSet());

        return nodes.stream()
            .filter(node -> targetNodeIds.contains(node.getNodeId()))
            .map(node -> synchronizeNodeClearance(userId, node.getNodeId()))
            .toList();
    }

    @Transactional
    public NodeClearanceResponse.Detail getNodeClearance(Long userId, Long nodeId) {
        return nodeClearanceRepository.findByUserIdAndNodeNodeId(userId, nodeId)
            .map(this::toDetail)
            .orElseGet(() -> synchronizeNodeClearance(userId, nodeId));
    }

    @Transactional
    public List<NodeClearanceResponse.Detail> getNodeClearances(Long userId, Long roadmapId) {
        if (roadmapId == null) {
            return nodeClearanceRepository.findAllByUserIdOrderByLastCalculatedAtDesc(userId)
                .stream()
                .map(this::toDetail)
                .toList();
        }

        roadmapRepository.findByRoadmapIdAndIsDeletedFalse(roadmapId)
            .orElseThrow(() -> new CustomException(ErrorCode.ROADMAP_NOT_FOUND));

        List<NodeClearance> clearances =
            nodeClearanceRepository.findAllByUserIdAndNodeRoadmapRoadmapIdOrderByNodeSortOrderAscNodeNodeIdAsc(
                userId,
                roadmapId
            );

        if (!clearances.isEmpty()) {
            return clearances.stream()
                .map(this::toDetail)
                .toList();
        }

        List<RoadmapNode> nodes = roadmapNodeRepository.findAllByRoadmapRoadmapId(roadmapId)
            .stream()
            .sorted(
                Comparator.comparing(RoadmapNode::getSortOrder, Comparator.nullsLast(Integer::compareTo))
                    .thenComparing(RoadmapNode::getNodeId)
            )
            .toList();

        List<NodeClearanceResponse.Detail> results = new ArrayList<>();

        for (RoadmapNode node : nodes) {
            results.add(synchronizeNodeClearance(userId, node.getNodeId()));
        }

        return results;
    }

    @Transactional
    public List<NodeClearanceResponse.ReasonDetail> getNodeClearanceReasons(Long userId, Long nodeId) {
        NodeClearance clearance = ensureNodeClearance(userId, nodeId);

        return nodeClearanceReasonRepository.findAllByNodeClearanceIdOrderByIdAsc(clearance.getId())
            .stream()
            .map(this::toReasonDetail)
            .toList();
    }

    @Transactional
    public NodeClearanceResponse.ProofCheck proofCheck(Long userId, Long nodeId) {
        NodeClearance clearance = ensureNodeClearance(userId, nodeId);
        List<NodeClearanceResponse.ReasonDetail> reasons = nodeClearanceReasonRepository
            .findAllByNodeClearanceIdOrderByIdAsc(clearance.getId())
            .stream()
            .map(this::toReasonDetail)
            .toList();

        return NodeClearanceResponse.ProofCheck.builder()
            .nodeId(nodeId)
            .proofEligible(clearance.getProofEligible())
            .reasons(reasons)
            .build();
    }

    @Transactional
    public NodeClearanceResponse.Detail synchronizeNodeClearance(Long userId, Long nodeId) {
        User user = validateUser(userId);
        RoadmapNode node = roadmapNodeRepository.findById(nodeId)
            .orElseThrow(() -> new CustomException(ErrorCode.ROADMAP_NODE_NOT_FOUND));

        NodeClearanceEvaluator.EvaluationResult evaluationResult = nodeClearanceEvaluator.evaluate(userId, nodeId);

        NodeClearance nodeClearance = nodeClearanceRepository.findByUserIdAndNodeNodeId(userId, nodeId)
            .orElseGet(() -> NodeClearance.builder()
                .user(user)
                .node(node)
                .build());

        nodeClearance.recalculate(
            evaluationResult.getClearanceStatus(),
            evaluationResult.getLessonCompletionRate(),
            evaluationResult.isRequiredTagsSatisfied(),
            evaluationResult.getMissingTags().size(),
            evaluationResult.isLessonCompleted(),
            evaluationResult.isQuizPassed(),
            evaluationResult.isAssignmentPassed(),
            evaluationResult.isProofEligible()
        );

        NodeClearance savedNodeClearance = nodeClearanceRepository.save(nodeClearance);

        nodeClearanceReasonRepository.deleteAllByNodeClearanceId(savedNodeClearance.getId());
        nodeClearanceReasonRepository.saveAll(
            evaluationResult.getReasons().stream()
                .map(reason -> NodeClearanceReason.builder()
                    .nodeClearance(savedNodeClearance)
                    .reasonType(reason.getReasonType())
                    .satisfied(reason.isSatisfied())
                    .detailMessage(reason.getDetailMessage())
                    .build())
                .toList()
        );

        return toDetail(savedNodeClearance);
    }

    private NodeClearance ensureNodeClearance(Long userId, Long nodeId) {
        return nodeClearanceRepository.findByUserIdAndNodeNodeId(userId, nodeId)
            .orElseGet(() -> {
                synchronizeNodeClearance(userId, nodeId);
                return nodeClearanceRepository.findByUserIdAndNodeNodeId(userId, nodeId)
                    .orElseThrow(() -> new CustomException(ErrorCode.NODE_CLEARANCE_NOT_FOUND));
            });
    }

    private User validateUser(Long userId) {
        return userRepository.findById(userId)
            .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
    }

    private NodeClearanceResponse.Detail toDetail(NodeClearance nodeClearance) {
        return NodeClearanceResponse.Detail.builder()
            .nodeId(nodeClearance.getNode().getNodeId())
            .nodeTitle(nodeClearance.getNode().getTitle())
            .clearanceStatus(nodeClearance.getClearanceStatus().name())
            .lessonCompletionRate(nodeClearance.getLessonCompletionRate())
            .requiredTagsSatisfied(nodeClearance.getRequiredTagsSatisfied())
            .missingTagCount(nodeClearance.getMissingTagCount())
            .lessonCompleted(nodeClearance.getLessonCompleted())
            .quizPassed(nodeClearance.getQuizPassed())
            .assignmentPassed(nodeClearance.getAssignmentPassed())
            .proofEligible(nodeClearance.getProofEligible())
            .lastCalculatedAt(nodeClearance.getLastCalculatedAt())
            .clearedAt(nodeClearance.getClearedAt())
            .build();
    }

    private NodeClearanceResponse.ReasonDetail toReasonDetail(NodeClearanceReason nodeClearanceReason) {
        return NodeClearanceResponse.ReasonDetail.builder()
            .reasonType(nodeClearanceReason.getReasonType())
            .satisfied(nodeClearanceReason.getSatisfied())
            .detailMessage(nodeClearanceReason.getDetailMessage())
            .build();
    }
}
