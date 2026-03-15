package com.devpath.api.learner.service;

import com.devpath.api.learner.dto.SkillCheckDto;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.roadmap.entity.CustomNodePrerequisite;
import com.devpath.domain.roadmap.entity.CustomRoadmap;
import com.devpath.domain.roadmap.entity.CustomRoadmapNode;
import com.devpath.domain.roadmap.entity.NodeRequiredTag;
import com.devpath.domain.roadmap.entity.NodeStatus;
import com.devpath.domain.roadmap.entity.Prerequisite;
import com.devpath.domain.roadmap.entity.Roadmap;
import com.devpath.domain.roadmap.entity.RoadmapNode;
import com.devpath.domain.roadmap.repository.CustomNodePrerequisiteRepository;
import com.devpath.domain.roadmap.repository.CustomRoadmapNodeRepository;
import com.devpath.domain.roadmap.repository.CustomRoadmapRepository;
import com.devpath.domain.roadmap.repository.NodeRequiredTagRepository;
import com.devpath.domain.roadmap.repository.PrerequisiteRepository;
import com.devpath.domain.roadmap.repository.RoadmapNodeRepository;
import com.devpath.domain.roadmap.repository.RoadmapRepository;
import com.devpath.domain.user.entity.Tag;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.entity.UserTechStack;
import com.devpath.domain.user.repository.TagRepository;
import com.devpath.domain.user.repository.UserRepository;
import com.devpath.domain.user.repository.UserTechStackRepository;
import java.util.ArrayList;
import java.util.Collections;
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
@Transactional(readOnly = true)
public class SkillCheckService {

    private final UserTechStackRepository userTechStackRepository;
    private final TagRepository tagRepository;
    private final UserRepository userRepository;
    private final RoadmapRepository roadmapRepository;
    private final NodeRequiredTagRepository nodeRequiredTagRepository;
    private final RoadmapNodeRepository roadmapNodeRepository;
    private final PrerequisiteRepository prerequisiteRepository;
    private final CustomRoadmapRepository customRoadmapRepository;
    private final CustomRoadmapNodeRepository customRoadmapNodeRepository;
    private final CustomNodePrerequisiteRepository customNodePrerequisiteRepository;

    public List<String> suggestSkillsForRoadmap(Long userId, Long roadmapId) {
        validateUser(userId);

        Roadmap roadmap = roadmapRepository.findById(roadmapId)
                .orElseThrow(() -> new CustomException(ErrorCode.ROADMAP_NOT_FOUND));

        List<String> userSkills = userTechStackRepository.findTagNamesByUserId(userId);
        List<RoadmapNode> roadmapNodes = roadmapNodeRepository.findAllByRoadmapRoadmapId(roadmap.getRoadmapId());

        Set<String> allRequiredSkills = roadmapNodes.stream()
                .flatMap(node -> nodeRequiredTagRepository.findAllByNodeId(node.getNodeId()).stream())
                .map(NodeRequiredTag::getTag)
                .map(Tag::getName)
                .collect(Collectors.toCollection(LinkedHashSet::new));

        return allRequiredSkills.stream()
                .filter(skill -> !userSkills.contains(skill))
                .toList();
    }

    public List<String> getUserSkills(Long userId) {
        validateUser(userId);
        return userTechStackRepository.findTagNamesByUserId(userId);
    }

    @Transactional
    public List<String> registerUserSkills(Long userId, List<String> tagNames) {
        User user = validateUser(userId);
        List<String> existingSkills = userTechStackRepository.findTagNamesByUserId(userId);
        Set<String> knownSkills = new LinkedHashSet<>(existingSkills);
        List<String> registeredSkills = new ArrayList<>();
        List<String> requestedTagNames = tagNames == null ? List.of() : tagNames;

        for (String tagName : requestedTagNames) {
            if (tagName == null || tagName.isBlank()) {
                continue;
            }

            String normalizedTagName = tagName.trim();
            if (!knownSkills.add(normalizedTagName)) {
                continue;
            }

            Tag tag = tagRepository.findByName(normalizedTagName)
                    .orElseGet(() -> tagRepository.save(
                            Tag.builder()
                                    .name(normalizedTagName)
                                    .isOfficial(false)
                                    .build()
                    ));

            userTechStackRepository.save(
                    UserTechStack.builder()
                            .user(user)
                            .tag(tag)
                            .build()
            );
            registeredSkills.add(normalizedTagName);
        }

        return registeredSkills;
    }

    public boolean checkNodeLockStatus(Long userId, Long nodeId) {
        validateUser(userId);

        RoadmapNode node = roadmapNodeRepository.findById(nodeId)
                .orElseThrow(() -> new CustomException(ErrorCode.ROADMAP_NODE_NOT_FOUND));

        Map<Long, Boolean> unlockedStatusByNodeId = getUnlockedStatusByNodeId(userId, node.getRoadmap().getRoadmapId());
        return Boolean.TRUE.equals(unlockedStatusByNodeId.get(nodeId));
    }

    public SkillCheckDto.RoadmapLockStatusResponse getRoadmapLockStatus(Long userId, Long roadmapId) {
        validateUser(userId);

        Roadmap roadmap = roadmapRepository.findById(roadmapId)
                .orElseThrow(() -> new CustomException(ErrorCode.ROADMAP_NOT_FOUND));
        List<RoadmapNode> roadmapNodes = roadmapNodeRepository.findByRoadmapOrderBySortOrderAsc(roadmap);
        Map<Long, List<Long>> prerequisiteNodeIdsByNodeId = getPrerequisiteNodeIdsByNodeId(userId, roadmapId, roadmapNodes);
        Map<Long, Boolean> unlockedStatusByNodeId = getUnlockedStatusByNodeId(userId, roadmapId);

        List<SkillCheckDto.NodeLockStatusResponse> nodeLockStatus = roadmapNodes.stream()
                .map(node -> {
                    boolean isLocked = !Boolean.TRUE.equals(unlockedStatusByNodeId.get(node.getNodeId()));
                    List<Long> prerequisiteNodeIds =
                            prerequisiteNodeIdsByNodeId.getOrDefault(node.getNodeId(), List.of());

                    return SkillCheckDto.NodeLockStatusResponse.builder()
                            .nodeId(node.getNodeId())
                            .nodeTitle(node.getTitle())
                            .isLocked(isLocked)
                            .lockReason(isLocked ? "선행 노드를 먼저 완료해야 합니다." : null)
                            .requiredNodeIds(prerequisiteNodeIds)
                            .build();
                })
                .toList();

        int unlockedNodes = (int) nodeLockStatus.stream()
                .filter(node -> !Boolean.TRUE.equals(node.getIsLocked()))
                .count();

        return SkillCheckDto.RoadmapLockStatusResponse.builder()
                .roadmapId(roadmapId)
                .roadmapTitle(roadmap.getTitle())
                .totalNodes(nodeLockStatus.size())
                .unlockedNodes(unlockedNodes)
                .nodeLockStatus(nodeLockStatus)
                .build();
    }

    private Map<Long, Boolean> getUnlockedStatusByNodeId(Long userId, Long roadmapId) {
        Roadmap roadmap = roadmapRepository.findById(roadmapId)
                .orElseThrow(() -> new CustomException(ErrorCode.ROADMAP_NOT_FOUND));
        List<RoadmapNode> roadmapNodes = roadmapNodeRepository.findByRoadmapOrderBySortOrderAsc(roadmap);
        Map<Long, List<Long>> prerequisiteNodeIdsByNodeId = getPrerequisiteNodeIdsByNodeId(userId, roadmapId, roadmapNodes);
        Map<Long, CustomRoadmapNode> customNodesByOriginalNodeId = getCustomNodesByOriginalNodeId(userId, roadmapId);

        Map<Long, Boolean> unlockedStatusByNodeId = new LinkedHashMap<>();

        // 커스텀 로드맵이 있으면 실제 완료 상태를 기준으로 잠금 여부를 계산한다.
        for (RoadmapNode roadmapNode : roadmapNodes) {
            List<Long> prerequisiteNodeIds =
                    prerequisiteNodeIdsByNodeId.getOrDefault(roadmapNode.getNodeId(), List.of());

            boolean unlocked = prerequisiteNodeIds.stream()
                    .allMatch(prerequisiteNodeId -> {
                        CustomRoadmapNode prerequisiteNode = customNodesByOriginalNodeId.get(prerequisiteNodeId);
                        return prerequisiteNode != null && prerequisiteNode.getStatus() == NodeStatus.COMPLETED;
                    });

            if (customNodesByOriginalNodeId.isEmpty()) {
                unlocked = prerequisiteNodeIds.isEmpty();
            }

            unlockedStatusByNodeId.put(roadmapNode.getNodeId(), unlocked);
        }

        return unlockedStatusByNodeId;
    }

    private Map<Long, List<Long>> getPrerequisiteNodeIdsByNodeId(
            Long userId,
            Long roadmapId,
            List<RoadmapNode> roadmapNodes
    ) {
        Map<Long, List<Long>> prerequisiteNodeIdsByNodeId = new LinkedHashMap<>();
        Map<Long, CustomRoadmapNode> customNodesByOriginalNodeId = getCustomNodesByOriginalNodeId(userId, roadmapId);
        CustomRoadmap customRoadmap =
                customRoadmapRepository.findByUserIdAndOriginalRoadmapRoadmapId(userId, roadmapId).orElse(null);

        if (customRoadmap != null) {
            for (CustomNodePrerequisite prerequisite :
                    customNodePrerequisiteRepository.findAllByCustomRoadmap(customRoadmap)) {
                Long nodeId = prerequisite.getCustomNode().getOriginalNode().getNodeId();
                Long prerequisiteNodeId =
                        prerequisite.getPrerequisiteCustomNode().getOriginalNode().getNodeId();

                prerequisiteNodeIdsByNodeId
                        .computeIfAbsent(nodeId, ignored -> new ArrayList<>())
                        .add(prerequisiteNodeId);
            }
        }

        if (prerequisiteNodeIdsByNodeId.isEmpty()) {
            for (Prerequisite prerequisite : prerequisiteRepository.findAllByNodeRoadmapRoadmapId(roadmapId)) {
                prerequisiteNodeIdsByNodeId
                        .computeIfAbsent(prerequisite.getNode().getNodeId(), ignored -> new ArrayList<>())
                        .add(prerequisite.getPreNode().getNodeId());
            }
            return prerequisiteNodeIdsByNodeId;
        }

        // 커스텀 노드가 일부만 있는 경우에는 공식 선행 관계를 기본값으로 보완한다.
        Map<Long, List<Long>> officialPrerequisiteNodeIdsByNodeId = new LinkedHashMap<>();
        for (Prerequisite prerequisite : prerequisiteRepository.findAllByNodeRoadmapRoadmapId(roadmapId)) {
            officialPrerequisiteNodeIdsByNodeId
                    .computeIfAbsent(prerequisite.getNode().getNodeId(), ignored -> new ArrayList<>())
                    .add(prerequisite.getPreNode().getNodeId());
        }

        for (RoadmapNode roadmapNode : roadmapNodes) {
            if (customNodesByOriginalNodeId.containsKey(roadmapNode.getNodeId())) {
                prerequisiteNodeIdsByNodeId.putIfAbsent(roadmapNode.getNodeId(), List.of());
                continue;
            }

            prerequisiteNodeIdsByNodeId.put(
                    roadmapNode.getNodeId(),
                    officialPrerequisiteNodeIdsByNodeId.getOrDefault(roadmapNode.getNodeId(), List.of())
            );
        }

        return prerequisiteNodeIdsByNodeId;
    }

    private Map<Long, CustomRoadmapNode> getCustomNodesByOriginalNodeId(Long userId, Long roadmapId) {
        CustomRoadmap customRoadmap =
                customRoadmapRepository.findByUserIdAndOriginalRoadmapRoadmapId(userId, roadmapId).orElse(null);

        if (customRoadmap == null) {
            return Collections.emptyMap();
        }

        return customRoadmapNodeRepository.findAllByCustomRoadmap(customRoadmap).stream()
                .collect(Collectors.toMap(
                        customNode -> customNode.getOriginalNode().getNodeId(),
                        customNode -> customNode
                ));
    }

    private User validateUser(Long userId) {
        if (userId == null) {
            throw new CustomException(ErrorCode.UNAUTHORIZED);
        }

        return userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
    }
}
