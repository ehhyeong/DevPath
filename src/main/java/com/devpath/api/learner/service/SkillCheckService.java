package com.devpath.api.learner.service;

import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.roadmap.entity.NodeRequiredTag;
import com.devpath.domain.roadmap.entity.Roadmap;
import com.devpath.domain.roadmap.entity.RoadmapNode;
import com.devpath.domain.roadmap.repository.NodeRequiredTagRepository;
import com.devpath.domain.roadmap.repository.RoadmapNodeRepository;
import com.devpath.domain.roadmap.repository.RoadmapRepository;
import com.devpath.domain.user.entity.Tag;
import com.devpath.domain.user.repository.TagRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.entity.UserTechStack;
import com.devpath.domain.user.repository.UserRepository;
import com.devpath.domain.user.repository.UserTechStackRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

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

    /**
     * 로드맵 필수 스킬 추천
     */
    public List<String> suggestSkillsForRoadmap(Long userId, Long roadmapId) {
        // 로드맵 존재 여부 확인
        Roadmap roadmap = roadmapRepository.findById(roadmapId)
                .orElseThrow(() -> new CustomException(ErrorCode.ROADMAP_NOT_FOUND));

        // 사용자가 이미 보유한 스킬
        List<String> userSkills = userTechStackRepository.findTagNamesByUserId(userId);

        // 로드맵의 모든 노드 조회
        List<RoadmapNode> roadmapNodes = roadmapNodeRepository.findByRoadmap(roadmap);
        
        // 각 노드의 필수 태그 수집
        Set<String> allRequiredSkills = roadmapNodes.stream()
                .flatMap(node -> nodeRequiredTagRepository.findByRoadmapNode(node).stream())
                .map(nrt -> nrt.getTag().getName())
                .collect(Collectors.toSet());

        // 아직 보유하지 않은 스킬만 추천
        return allRequiredSkills.stream()
                .filter(skill -> !userSkills.contains(skill))
                .collect(Collectors.toList());
    }

    /**
     * 사용자 보유 스킬 조회
     */
    public List<String> getUserSkills(Long userId) {
        return userTechStackRepository.findTagNamesByUserId(userId);
    }

    /**
     * 사용자 스킬 일괄 등록
     */
    @Transactional
    public List<String> registerUserSkills(Long userId, List<String> tagNames) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        // 이미 보유한 스킬 조회
        List<String> existingSkills = userTechStackRepository.findTagNamesByUserId(userId);

        List<String> registeredSkills = new ArrayList<>();

        for (String tagName : tagNames) {
            // 이미 보유한 스킬은 스킵
            if (existingSkills.contains(tagName)) {
                continue;
            }

            // 태그 조회 또는 생성
            Tag tag = tagRepository.findByName(tagName)
                    .orElseGet(() -> {
                        Tag newTag = Tag.builder()
                                .name(tagName)
                                .isOfficial(false)
                                .build();
                        return tagRepository.save(newTag);
                    });

            // UserTechStack 생성
            UserTechStack userTechStack = UserTechStack.builder()
                    .user(user)
                    .tag(tag)
                    .build();

            userTechStackRepository.save(userTechStack);
            registeredSkills.add(tagName);
        }

        return registeredSkills;
    }

    /**
     * 로드맵의 잠금/해금 상태 확인
     */
    public boolean checkNodeLockStatus(Long userId, Long nodeId) {
        // TODO: 실제 구현 시 선행 노드 완료 여부 확인
        // 임시: 항상 해금 상태로 반환
        return true;
    }
}
