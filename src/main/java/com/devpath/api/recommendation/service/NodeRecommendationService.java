package com.devpath.api.recommendation.service;

import com.devpath.api.recommendation.dto.NodeRecommendationDto;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.roadmap.entity.CustomRoadmap;
import com.devpath.domain.roadmap.entity.CustomRoadmapNode;
import com.devpath.domain.roadmap.entity.NodeRecommendation;
import com.devpath.domain.roadmap.entity.RecommendationStatus;
import com.devpath.domain.roadmap.entity.Roadmap;
import com.devpath.domain.roadmap.entity.RoadmapNode;
import com.devpath.domain.roadmap.repository.CustomRoadmapNodeRepository;
import com.devpath.domain.roadmap.repository.CustomRoadmapRepository;
import com.devpath.domain.roadmap.repository.NodeRecommendationRepository;
import com.devpath.domain.roadmap.repository.RoadmapNodeRepository;
import com.devpath.domain.roadmap.repository.RoadmapRepository;
import com.devpath.domain.roadmap.service.CustomRoadmapCopyService;
import com.devpath.domain.roadmap.service.CustomRoadmapPrerequisiteSyncService;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class NodeRecommendationService {

  private final NodeRecommendationRepository nodeRecommendationRepository;
  private final UserRepository userRepository;
  private final RoadmapRepository roadmapRepository;
  private final RoadmapNodeRepository roadmapNodeRepository;
  private final CustomRoadmapRepository customRoadmapRepository;
  private final CustomRoadmapNodeRepository customRoadmapNodeRepository;
  private final CustomRoadmapPrerequisiteSyncService prerequisiteSyncService;
  private final CustomRoadmapCopyService customRoadmapCopyService;
  private final NodeRecommendationPlanner recommendationPlanner;
  private final NodeRecommendationArtifacts recommendationArtifacts;

  @Transactional
  public List<NodeRecommendation> generateRecommendations(Long userId, Long roadmapId) {
    User user = getUser(userId);
    Roadmap roadmap = getRoadmap(roadmapId);

    List<NodeRecommendation> existingPending =
        nodeRecommendationRepository.findByUser_IdAndRoadmap_RoadmapIdAndStatus(
            userId, roadmapId, RecommendationStatus.PENDING);

    existingPending.forEach(
        recommendation -> {
          RecommendationStatus beforeStatus = recommendation.getStatus();
          recommendation.expire();
          recommendationArtifacts.saveHistory(
              user,
              recommendation.getRecommendationId(),
              recommendation.getRecommendedNode(),
              beforeStatus.name(),
              recommendation.getStatus().name(),
              "EXPIRED",
              "새 추천 생성 전에 기존 대기 추천을 만료 처리했습니다.");
        });

    List<RoadmapNode> roadmapNodes =
        roadmapNodeRepository.findByRoadmapOrderBySortOrderAsc(roadmap);
    if (roadmapNodes.isEmpty()) {
      return List.of();
    }

    NodeRecommendationPlanner.RecommendationPlan plan =
        recommendationPlanner.plan(userId, roadmapId, roadmapNodes);
    List<NodeRecommendation> recommendations = new ArrayList<>();
    LocalDateTime expiresAt = LocalDateTime.now().plusDays(7);
    for (NodeRecommendationPlanner.PlannedRecommendation planned : plan.recommendations()) {
      NodeRecommendation recommendation =
          nodeRecommendationRepository.save(
              NodeRecommendation.builder()
                  .user(user)
                  .roadmap(roadmap)
                  .recommendedNode(planned.node())
                  .recommendationType(planned.type())
                  .reason(planned.reason())
                  .priority(recommendations.size() + 1)
                  .expiresAt(expiresAt)
                  .build());
      recommendations.add(recommendation);
      recommendationArtifacts.saveGenerated(
          user,
          recommendation,
          planned.coveragePercent(),
          planned.missingCount(),
          plan.averageProgressPercent());
    }

    return recommendations;
  }

  @Transactional
  public NodeRecommendationDto.GenerateRecommendationsResponse generateRecommendationResponse(
      Long userId, Long roadmapId) {
    return NodeRecommendationDto.GenerateRecommendationsResponse.from(
        roadmapId, generateRecommendations(userId, roadmapId));
  }

  public List<NodeRecommendation> getRecommendations(Long userId, Long roadmapId) {
    getUser(userId);
    getRoadmap(roadmapId);
    return nodeRecommendationRepository.findByUser_IdAndRoadmap_RoadmapId(userId, roadmapId);
  }

  @Transactional
  public NodeRecommendationDto.RoadmapRecommendationsResponse getRoadmapRecommendations(
      Long userId, Long roadmapId, Boolean pendingOnly) {
    processExpiredRecommendations(userId, roadmapId);

    Roadmap roadmap = getRoadmap(roadmapId);
    List<NodeRecommendation> recommendations =
        Boolean.TRUE.equals(pendingOnly)
            ? getPendingRecommendations(userId, roadmapId)
            : getRecommendations(userId, roadmapId);

    long pendingCount =
        recommendations.stream()
            .filter(recommendation -> recommendation.getStatus() == RecommendationStatus.PENDING)
            .count();
    long acceptedCount =
        recommendations.stream()
            .filter(recommendation -> recommendation.getStatus() == RecommendationStatus.ACCEPTED)
            .count();
    long rejectedCount =
        recommendations.stream()
            .filter(recommendation -> recommendation.getStatus() == RecommendationStatus.REJECTED)
            .count();

    return NodeRecommendationDto.RoadmapRecommendationsResponse.builder()
        .roadmapId(roadmapId)
        .roadmapTitle(roadmap.getTitle())
        .totalRecommendations(recommendations.size())
        .pendingCount((int) pendingCount)
        .acceptedCount((int) acceptedCount)
        .rejectedCount((int) rejectedCount)
        .recommendations(
            recommendations.stream()
                .map(NodeRecommendationDto.RecommendationResponse::from)
                .toList())
        .build();
  }

  public List<NodeRecommendation> getPendingRecommendations(Long userId, Long roadmapId) {
    getUser(userId);
    getRoadmap(roadmapId);

    List<NodeRecommendation> pending =
        nodeRecommendationRepository.findByUser_IdAndRoadmap_RoadmapIdAndStatus(
            userId, roadmapId, RecommendationStatus.PENDING);

    pending.stream()
        .filter(NodeRecommendation::isExpired)
        .forEach(
            recommendation -> {
              RecommendationStatus beforeStatus = recommendation.getStatus();
              recommendation.expire();
              recommendationArtifacts.saveHistory(
                  recommendation.getUser(),
                  recommendation.getRecommendationId(),
                  recommendation.getRecommendedNode(),
                  beforeStatus.name(),
                  recommendation.getStatus().name(),
                  "EXPIRED",
                  "조회 시점에 만료된 추천을 자동 만료 처리했습니다.");
            });

    return pending.stream().filter(rec -> !rec.isExpired()).toList();
  }

  @Transactional
  public NodeRecommendation acceptRecommendation(Long userId, Long recommendationId) {
    getUser(userId);
    NodeRecommendation recommendation = getOwnedRecommendation(userId, recommendationId);

    validatePendingRecommendation(recommendation);

    RecommendationStatus beforeStatus = recommendation.getStatus();
    CustomRoadmap customRoadmap = getOrCreateCustomRoadmap(userId, recommendation.getRoadmap());
    ensureRecommendedNodeExists(customRoadmap, recommendation.getRecommendedNode());

    recommendation.accept();

    recommendationArtifacts.saveHistory(
        recommendation.getUser(),
        recommendation.getRecommendationId(),
        recommendation.getRecommendedNode(),
        beforeStatus.name(),
        recommendation.getStatus().name(),
        "ACCEPTED",
        recommendation.getReason());

    recommendationArtifacts.syncSupplementStatus(
        recommendation.getUser().getId(), recommendation.getRecommendedNode().getNodeId(), true);

    return recommendation;
  }

  @Transactional
  public NodeRecommendationDto.ProcessRecommendationResponse acceptRecommendationResponse(
      Long userId, Long recommendationId) {
    return NodeRecommendationDto.ProcessRecommendationResponse.from(
        acceptRecommendation(userId, recommendationId), "추천 노드를 내 로드맵에 추가했습니다.");
  }

  @Transactional
  public NodeRecommendation rejectRecommendation(Long userId, Long recommendationId) {
    getUser(userId);
    NodeRecommendation recommendation = getOwnedRecommendation(userId, recommendationId);

    if (!recommendation.isPending()) {
      throw new CustomException(ErrorCode.RECOMMENDATION_ALREADY_PROCESSED);
    }

    RecommendationStatus beforeStatus = recommendation.getStatus();
    recommendation.reject();

    recommendationArtifacts.saveHistory(
        recommendation.getUser(),
        recommendation.getRecommendationId(),
        recommendation.getRecommendedNode(),
        beforeStatus.name(),
        recommendation.getStatus().name(),
        "REJECTED",
        recommendation.getReason());

    recommendationArtifacts.syncSupplementStatus(
        recommendation.getUser().getId(), recommendation.getRecommendedNode().getNodeId(), false);

    return recommendation;
  }

  @Transactional
  public NodeRecommendationDto.ProcessRecommendationResponse rejectRecommendationResponse(
      Long userId, Long recommendationId) {
    return NodeRecommendationDto.ProcessRecommendationResponse.from(
        rejectRecommendation(userId, recommendationId), "추천을 거절했습니다.");
  }

  @Transactional
  public NodeRecommendation expireRecommendation(Long userId, Long recommendationId) {
    getUser(userId);
    NodeRecommendation recommendation = getOwnedRecommendation(userId, recommendationId);

    RecommendationStatus beforeStatus = recommendation.getStatus();
    recommendation.expire();

    recommendationArtifacts.saveHistory(
        recommendation.getUser(),
        recommendation.getRecommendationId(),
        recommendation.getRecommendedNode(),
        beforeStatus.name(),
        recommendation.getStatus().name(),
        "EXPIRED",
        "학습자가 추천을 수동 만료 처리했습니다.");

    return recommendation;
  }

  @Transactional
  public NodeRecommendationDto.ProcessRecommendationResponse expireRecommendationResponse(
      Long userId, Long recommendationId) {
    return NodeRecommendationDto.ProcessRecommendationResponse.from(
        expireRecommendation(userId, recommendationId), "추천을 만료 처리했습니다.");
  }

  @Transactional
  public void processExpiredRecommendations(Long userId, Long roadmapId) {
    List<NodeRecommendation> expired =
        nodeRecommendationRepository.findExpiredRecommendations(
            userId, roadmapId, LocalDateTime.now());

    expired.forEach(
        recommendation -> {
          RecommendationStatus beforeStatus = recommendation.getStatus();
          recommendation.expire();

          recommendationArtifacts.saveHistory(
              recommendation.getUser(),
              recommendation.getRecommendationId(),
              recommendation.getRecommendedNode(),
              beforeStatus.name(),
              recommendation.getStatus().name(),
              "EXPIRED",
              "만료 시간이 지나 자동 만료 처리되었습니다.");
        });
  }

  private User getUser(Long userId) {
    if (userId == null) {
      throw new CustomException(ErrorCode.UNAUTHORIZED);
    }

    return userRepository
        .findById(userId)
        .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
  }

  private Roadmap getRoadmap(Long roadmapId) {
    return roadmapRepository
        .findById(roadmapId)
        .orElseThrow(() -> new CustomException(ErrorCode.ROADMAP_NOT_FOUND));
  }

  private NodeRecommendation getOwnedRecommendation(Long userId, Long recommendationId) {
    return nodeRecommendationRepository
        .findByRecommendationIdAndUser_Id(recommendationId, userId)
        .orElseThrow(() -> new CustomException(ErrorCode.RECOMMENDATION_NOT_FOUND));
  }

  private void validatePendingRecommendation(NodeRecommendation recommendation) {
    if (!recommendation.isPending()) {
      throw new CustomException(ErrorCode.RECOMMENDATION_ALREADY_PROCESSED);
    }

    if (recommendation.isExpired()) {
      recommendation.expire();

      recommendationArtifacts.saveHistory(
          recommendation.getUser(),
          recommendation.getRecommendationId(),
          recommendation.getRecommendedNode(),
          RecommendationStatus.PENDING.name(),
          recommendation.getStatus().name(),
          "EXPIRED",
          "만료된 추천이라 처리할 수 없습니다.");

      throw new CustomException(ErrorCode.RECOMMENDATION_EXPIRED);
    }
  }

  private CustomRoadmap getOrCreateCustomRoadmap(Long userId, Roadmap roadmap) {
    return customRoadmapRepository
        .findByUserIdAndOriginalRoadmapRoadmapId(userId, roadmap.getRoadmapId())
        .orElseGet(
            () -> {
              customRoadmapCopyService.copyToCustomRoadmap(userId, roadmap.getRoadmapId());

              return customRoadmapRepository
                  .findByUserIdAndOriginalRoadmapRoadmapId(userId, roadmap.getRoadmapId())
                  .orElseThrow(() -> new CustomException(ErrorCode.CUSTOM_ROADMAP_NOT_FOUND));
            });
  }

  private void ensureRecommendedNodeExists(
      CustomRoadmap customRoadmap, RoadmapNode recommendedNode) {
    if (customRoadmapNodeRepository
        .findByCustomRoadmapAndOriginalNode(customRoadmap, recommendedNode)
        .isPresent()) {
      return;
    }

    customRoadmapNodeRepository.save(
        CustomRoadmapNode.builder()
            .customRoadmap(customRoadmap)
            .originalNode(recommendedNode)
            .build());

    prerequisiteSyncService.ensurePrerequisites(customRoadmap);
  }
}
