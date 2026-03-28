package com.devpath.api.learning.service;

import com.devpath.api.learning.component.NodeClearanceEvaluator;
import com.devpath.api.learning.dto.NodeClearanceRequest;
import com.devpath.api.learning.dto.NodeClearanceResponse;
import com.devpath.api.proof.service.ProofCardService;
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

// Node Clearance 서비스
@Service
@RequiredArgsConstructor
public class NodeClearanceService {

    // Node Clearance 저장소
    private final NodeClearanceRepository nodeClearanceRepository;

    // Node Clearance Reason 저장소
    private final NodeClearanceReasonRepository nodeClearanceReasonRepository;

    // Node Clearance 평가기
    private final NodeClearanceEvaluator nodeClearanceEvaluator;

    // Proof Card 서비스
    private final ProofCardService proofCardService;

    // 유저 저장소
    private final UserRepository userRepository;

    // 로드맵 저장소
    private final RoadmapRepository roadmapRepository;

    // 로드맵 노드 저장소
    private final RoadmapNodeRepository roadmapNodeRepository;

    // 로드맵의 노드 클리어를 재계산한다.
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

    // 특정 노드 클리어 상세를 조회한다.
    @Transactional(readOnly = true)
    public NodeClearanceResponse.Detail getNodeClearance(Long userId, Long nodeId) {
        return nodeClearanceRepository.findByUserIdAndNodeNodeId(userId, nodeId)
            .map(this::toDetail)
            .orElseGet(() -> synchronizeNodeClearance(userId, nodeId));
    }

    // 노드 클리어 목록을 조회한다.
    @Transactional(readOnly = true)
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

    // 특정 노드 클리어 근거 목록을 조회한다.
    @Transactional(readOnly = true)
    public List<NodeClearanceResponse.ReasonDetail> getNodeClearanceReasons(Long userId, Long nodeId) {
        NodeClearance clearance = ensureNodeClearance(userId, nodeId);

        return nodeClearanceReasonRepository.findAllByNodeClearanceIdOrderByIdAsc(clearance.getId())
            .stream()
            .map(this::toReasonDetail)
            .toList();
    }

    // 특정 노드의 Proof 발급 가능 여부를 점검한다.
    @Transactional(readOnly = true)
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

    // 특정 노드 클리어를 계산 후 저장한다.
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

        if (evaluationResult.isProofEligible()) {
            proofCardService.issueIfEligible(userId, nodeId);
        }

        return toDetail(savedNodeClearance);
    }

    // 저장된 노드 클리어가 없으면 즉시 계산한다.
    private NodeClearance ensureNodeClearance(Long userId, Long nodeId) {
        return nodeClearanceRepository.findByUserIdAndNodeNodeId(userId, nodeId)
            .orElseGet(() -> {
                synchronizeNodeClearance(userId, nodeId);
                return nodeClearanceRepository.findByUserIdAndNodeNodeId(userId, nodeId)
                    .orElseThrow(() -> new CustomException(ErrorCode.NODE_CLEARANCE_NOT_FOUND));
            });
    }

    // 유저 존재 여부를 검증한다.
    private User validateUser(Long userId) {
        return userRepository.findById(userId)
            .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
    }

    // Node Clearance 엔티티를 상세 응답으로 변환한다.
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

    // Node Clearance Reason 엔티티를 응답으로 변환한다.
    private NodeClearanceResponse.ReasonDetail toReasonDetail(NodeClearanceReason nodeClearanceReason) {
        return NodeClearanceResponse.ReasonDetail.builder()
            .reasonType(nodeClearanceReason.getReasonType())
            .satisfied(nodeClearanceReason.getSatisfied())
            .detailMessage(nodeClearanceReason.getDetailMessage())
            .build();
    }
}
