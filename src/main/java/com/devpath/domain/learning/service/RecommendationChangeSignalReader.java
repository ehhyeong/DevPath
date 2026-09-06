package com.devpath.domain.learning.service;

import com.devpath.domain.learning.entity.recommendation.RecommendationStatus;
import com.devpath.domain.learning.entity.recommendation.SupplementRecommendation;
import com.devpath.domain.learning.repository.TilDraftRepository;
import com.devpath.domain.learning.repository.recommendation.SupplementRecommendationRepository;
import com.devpath.domain.roadmap.repository.DiagnosisResultRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RecommendationChangeSignalReader {

  private final TilDraftRepository tilDraftRepository;
  private final DiagnosisResultRepository diagnosisResultRepository;
  private final SupplementRecommendationRepository supplementRecommendationRepository;

  public Signals read(Long userId, Long roadmapId) {
    List<SupplementRecommendation> pendingRecommendations =
        roadmapId == null
            ? supplementRecommendationRepository.findAllByUserIdAndStatusOrderByCreatedAtDesc(
                userId, RecommendationStatus.PENDING)
            : supplementRecommendationRepository
                .findAllByUserIdAndRoadmapNodeRoadmapRoadmapIdAndStatusOrderByCreatedAtDesc(
                    userId, roadmapId, RecommendationStatus.PENDING);

    return new Signals(
        tilDraftRepository.countByUserIdAndIsDeletedFalse(userId),
        diagnosisResultRepository.findTopByUser_IdOrderByCreatedAtDesc(userId).isPresent(),
        pendingRecommendations);
  }

  public record Signals(
      long tilCount,
      boolean hasWeaknessAnalysis,
      List<SupplementRecommendation> pendingRecommendations) {}
}
