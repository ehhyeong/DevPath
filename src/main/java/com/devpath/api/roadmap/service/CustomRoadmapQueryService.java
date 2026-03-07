package com.devpath.api.roadmap.service;

import com.devpath.api.user.repository.UserRepository;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.roadmap.entity.CustomRoadmap;
import com.devpath.domain.roadmap.repository.CustomNodePrerequisiteRepository;
import com.devpath.domain.roadmap.repository.CustomRoadmapNodeRepository;
import com.devpath.domain.roadmap.repository.CustomRoadmapRepository;
import com.devpath.domain.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CustomRoadmapQueryService {

    private final UserRepository userRepository;
    private final CustomRoadmapRepository customRoadmapRepository;
    private final CustomRoadmapNodeRepository customRoadmapNodeRepository;
    private final CustomNodePrerequisiteRepository customNodePrerequisiteRepository;

    @Transactional(readOnly = true)
    public List<CustomRoadmap> getMyRoadmaps(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
        return customRoadmapRepository.findAllByUserOrderByCreatedAtDesc(user);
    }

    @Transactional
    public void deleteMyRoadmap(Long userId, Long customRoadmapId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        CustomRoadmap roadmap = customRoadmapRepository.findById(customRoadmapId)
                .orElseThrow(() -> new CustomException(ErrorCode.CUSTOM_ROADMAP_NOT_FOUND));

        // 소유자 검증 (JWT 붙으면 userId는 principal로 교체)
        if (!roadmap.getUser().getId().equals(user.getId())) {
            throw new CustomException(ErrorCode.FORBIDDEN);
        }

        // 선행조건 -> 노드 -> 로드맵 순서로 삭제 (FK 안전)
        customNodePrerequisiteRepository.deleteAllByCustomRoadmap(roadmap);
        customRoadmapNodeRepository.deleteAllByCustomRoadmap(roadmap);
        customRoadmapRepository.delete(roadmap);
    }
}