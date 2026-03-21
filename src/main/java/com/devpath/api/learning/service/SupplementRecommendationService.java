package com.devpath.api.learning.service;

import com.devpath.api.learning.dto.SupplementRecommendationResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.learning.entity.recommendation.RecommendationStatus;
import com.devpath.domain.learning.entity.recommendation.SupplementRecommendation;
import com.devpath.domain.learning.repository.recommendation.SupplementRecommendationRepository;
import com.devpath.domain.roadmap.entity.RoadmapNode;
import com.devpath.domain.roadmap.repository.RoadmapNodeRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SupplementRecommendationService {

    private final SupplementRecommendationRepository supplementRecommendationRepository;
    private final RoadmapNodeRepository roadmapNodeRepository;
    private final UserRepository userRepository;

    // 보강 노드 후보를 생성한다.
    // 실제 AI 분석 로직은 추후 Gemini 연동 시 구현하며, 현재는 지정된 노드를 후보로 등록한다.
    @Transactional
    public SupplementRecommendationResponse createRecommendation(Long userId, Long nodeId, String reason) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        RoadmapNode node = roadmapNodeRepository.findById(nodeId)
                .orElseThrow(() -> new CustomException(ErrorCode.ROADMAP_NODE_NOT_FOUND));

        SupplementRecommendation recommendation = SupplementRecommendation.builder()
                .user(user)
                .roadmapNode(node)
                .reason(reason)
                .build();

        return SupplementRecommendationResponse.from(supplementRecommendationRepository.save(recommendation));
    }

    // 특정 학습자의 보강 노드 추천 목록을 조회한다. (전체 또는 상태별 필터링)
    @Transactional(readOnly = true)
    public List<SupplementRecommendationResponse> getRecommendations(Long userId, RecommendationStatus status) {
        List<SupplementRecommendation> recommendations;

        if (status != null) {
            recommendations = supplementRecommendationRepository
                    .findByUserIdAndStatusOrderByCreatedAtDesc(userId, status);
        } else {
            recommendations = supplementRecommendationRepository
                    .findByUserIdOrderByCreatedAtDesc(userId);
        }

        return recommendations.stream()
                .map(SupplementRecommendationResponse::from)
                .collect(Collectors.toList());
    }

    // 학습자가 추천을 수락한다.
    @Transactional
    public SupplementRecommendationResponse approveRecommendation(Long userId, Long recommendationId) {
        SupplementRecommendation recommendation = supplementRecommendationRepository
                .findById(recommendationId)
                .orElseThrow(() -> new CustomException(ErrorCode.SUPPLEMENT_RECOMMENDATION_NOT_FOUND));

        if (!recommendation.getUser().getId().equals(userId)) {
            throw new CustomException(ErrorCode.FORBIDDEN);
        }

        recommendation.approve();
        return SupplementRecommendationResponse.from(recommendation);
    }

    // 학습자가 추천을 거절한다.
    @Transactional
    public SupplementRecommendationResponse rejectRecommendation(Long userId, Long recommendationId) {
        SupplementRecommendation recommendation = supplementRecommendationRepository
                .findById(recommendationId)
                .orElseThrow(() -> new CustomException(ErrorCode.SUPPLEMENT_RECOMMENDATION_NOT_FOUND));

        if (!recommendation.getUser().getId().equals(userId)) {
            throw new CustomException(ErrorCode.FORBIDDEN);
        }

        recommendation.reject();
        return SupplementRecommendationResponse.from(recommendation);
    }
}
