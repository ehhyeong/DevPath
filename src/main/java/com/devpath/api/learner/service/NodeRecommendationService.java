package com.devpath.api.learner.service;

import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.roadmap.entity.*;
import com.devpath.domain.roadmap.repository.NodeRecommendationRepository;
import com.devpath.domain.roadmap.repository.RoadmapNodeRepository;
import com.devpath.domain.roadmap.repository.RoadmapRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class NodeRecommendationService {

    private final NodeRecommendationRepository nodeRecommendationRepository;
    private final UserRepository userRepository;
    private final RoadmapRepository roadmapRepository;
    private final RoadmapNodeRepository roadmapNodeRepository;

    /**
     * AI 추천 노드 생성
     * TODO: 실제 AI 로직 연동 필요
     */
    @Transactional
    public List<NodeRecommendation> generateRecommendations(Long userId, Long roadmapId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        Roadmap roadmap = roadmapRepository.findById(roadmapId)
                .orElseThrow(() -> new CustomException(ErrorCode.ROADMAP_NOT_FOUND));

        // 기존 PENDING 상태 추천 만료 처리
        List<NodeRecommendation> existingPending = nodeRecommendationRepository
                .findByUser_UserIdAndRoadmap_RoadmapIdAndStatus(
                        userId, roadmapId, RecommendationStatus.PENDING
                );

        existingPending.forEach(NodeRecommendation::expire);

        // TODO: 실제 AI 로직으로 추천 노드 생성
        // 임시: 로드맵의 임의 노드 2개 추천
        // roadmapNodeRepository에서 roadmap으로 조회하는 메서드가 없으므로 roadmap 객체로 조회
        Roadmap roadmapEntity = roadmapRepository.findById(roadmapId)
                .orElseThrow(() -> new CustomException(ErrorCode.ROADMAP_NOT_FOUND));
        
        List<RoadmapNode> allNodes = roadmapNodeRepository.findByRoadmap(roadmapEntity);
        List<NodeRecommendation> recommendations = new ArrayList<>();

        LocalDateTime expiresAt = LocalDateTime.now().plusDays(7); // 7일 후 만료

        if (!allNodes.isEmpty()) {
            // 보강 노드 추천 (첫 번째 노드)
            if (allNodes.size() >= 1) {
                NodeRecommendation remedial = NodeRecommendation.builder()
                        .user(user)
                        .roadmap(roadmap)
                        .recommendedNode(allNodes.get(0))
                        .recommendationType(NodeRecommendation.RecommendationType.REMEDIAL)
                        .reason("진단 결과 해당 영역의 보강이 필요합니다.")
                        .priority(1)
                        .expiresAt(expiresAt)
                        .build();
                recommendations.add(nodeRecommendationRepository.save(remedial));
            }

            // 심화 노드 추천 (두 번째 노드)
            if (allNodes.size() >= 2) {
                NodeRecommendation advanced = NodeRecommendation.builder()
                        .user(user)
                        .roadmap(roadmap)
                        .recommendedNode(allNodes.get(1))
                        .recommendationType(NodeRecommendation.RecommendationType.ADVANCED)
                        .reason("현재 수준에서 다음 단계 학습을 추천합니다.")
                        .priority(2)
                        .expiresAt(expiresAt)
                        .build();
                recommendations.add(nodeRecommendationRepository.save(advanced));
            }
        }

        return recommendations;
    }

    /**
     * 로드맵의 모든 추천 조회
     */
    public List<NodeRecommendation> getRecommendations(Long userId, Long roadmapId) {
        return nodeRecommendationRepository.findByUser_UserIdAndRoadmap_RoadmapId(userId, roadmapId);
    }

    /**
     * PENDING 상태 추천만 조회
     */
    public List<NodeRecommendation> getPendingRecommendations(Long userId, Long roadmapId) {
        List<NodeRecommendation> pending = nodeRecommendationRepository
                .findByUser_UserIdAndRoadmap_RoadmapIdAndStatus(
                        userId, roadmapId, RecommendationStatus.PENDING
                );

        // 만료된 추천 자동 처리
        pending.stream()
                .filter(NodeRecommendation::isExpired)
                .forEach(NodeRecommendation::expire);

        // 아직 유효한 추천만 반환
        return pending.stream()
                .filter(rec -> !rec.isExpired())
                .collect(Collectors.toList());
    }

    /**
     * 추천 수락
     */
    @Transactional
    public NodeRecommendation acceptRecommendation(Long recommendationId) {
        NodeRecommendation recommendation = nodeRecommendationRepository.findById(recommendationId)
                .orElseThrow(() -> new CustomException(ErrorCode.RECOMMENDATION_NOT_FOUND));

        if (!recommendation.isPending()) {
            throw new CustomException(ErrorCode.RECOMMENDATION_ALREADY_PROCESSED);
        }

        if (recommendation.isExpired()) {
            recommendation.expire();
            throw new CustomException(ErrorCode.RECOMMENDATION_EXPIRED);
        }

        recommendation.accept();

        // TODO: 수락 시 CustomRoadmapNode에 실제 노드 추가 로직 필요

        return recommendation;
    }

    /**
     * 추천 거절
     */
    @Transactional
    public NodeRecommendation rejectRecommendation(Long recommendationId) {
        NodeRecommendation recommendation = nodeRecommendationRepository.findById(recommendationId)
                .orElseThrow(() -> new CustomException(ErrorCode.RECOMMENDATION_NOT_FOUND));

        if (!recommendation.isPending()) {
            throw new CustomException(ErrorCode.RECOMMENDATION_ALREADY_PROCESSED);
        }

        recommendation.reject();
        return recommendation;
    }

    /**
     * 추천 만료 처리
     */
    @Transactional
    public NodeRecommendation expireRecommendation(Long recommendationId) {
        NodeRecommendation recommendation = nodeRecommendationRepository.findById(recommendationId)
                .orElseThrow(() -> new CustomException(ErrorCode.RECOMMENDATION_NOT_FOUND));

        recommendation.expire();
        return recommendation;
    }

    /**
     * 만료된 추천 일괄 처리
     */
    @Transactional
    public void processExpiredRecommendations(Long userId, Long roadmapId) {
        List<NodeRecommendation> expired = nodeRecommendationRepository
                .findExpiredRecommendations(userId, roadmapId, LocalDateTime.now());

        expired.forEach(NodeRecommendation::expire);
    }
}
