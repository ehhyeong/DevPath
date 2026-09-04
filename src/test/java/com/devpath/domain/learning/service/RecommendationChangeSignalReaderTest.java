package com.devpath.domain.learning.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.devpath.domain.learning.entity.recommendation.RecommendationStatus;
import com.devpath.domain.learning.entity.recommendation.SupplementRecommendation;
import com.devpath.domain.learning.repository.TilDraftRepository;
import com.devpath.domain.learning.repository.recommendation.SupplementRecommendationRepository;
import com.devpath.domain.roadmap.entity.DiagnosisResult;
import com.devpath.domain.roadmap.repository.DiagnosisResultRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class RecommendationChangeSignalReaderTest {

  @Mock private TilDraftRepository tilDraftRepository;
  @Mock private DiagnosisResultRepository diagnosisResultRepository;
  @Mock private SupplementRecommendationRepository supplementRecommendationRepository;
  @Mock private DiagnosisResult diagnosisResult;
  @Mock private SupplementRecommendation pendingRecommendation;

  private RecommendationChangeSignalReader reader;

  @BeforeEach
  void setUp() {
    reader =
        new RecommendationChangeSignalReader(
            tilDraftRepository, diagnosisResultRepository, supplementRecommendationRepository);
  }

  @Test
  void readReturnsLearningSignalsAndRoadmapPendingRecommendations() {
    long userId = 7L;
    long roadmapId = 12L;
    when(tilDraftRepository.countByUserIdAndIsDeletedFalse(userId)).thenReturn(3L);
    when(diagnosisResultRepository.findTopByUser_IdOrderByCreatedAtDesc(userId))
        .thenReturn(Optional.of(diagnosisResult));
    when(supplementRecommendationRepository
            .findAllByUserIdAndRoadmapNodeRoadmapRoadmapIdAndStatusOrderByCreatedAtDesc(
                userId, roadmapId, RecommendationStatus.PENDING))
        .thenReturn(List.of(pendingRecommendation));

    RecommendationChangeSignalReader.Signals signals = reader.read(userId, roadmapId);

    assertThat(signals.tilCount()).isEqualTo(3L);
    assertThat(signals.hasWeaknessAnalysis()).isTrue();
    assertThat(signals.pendingRecommendations()).containsExactly(pendingRecommendation);
    verify(supplementRecommendationRepository)
        .findAllByUserIdAndRoadmapNodeRoadmapRoadmapIdAndStatusOrderByCreatedAtDesc(
            userId, roadmapId, RecommendationStatus.PENDING);
  }

  @Test
  void readUsesAllPendingRecommendationsWhenRoadmapIsNotSpecified() {
    long userId = 7L;
    when(diagnosisResultRepository.findTopByUser_IdOrderByCreatedAtDesc(userId))
        .thenReturn(Optional.empty());
    when(supplementRecommendationRepository.findAllByUserIdAndStatusOrderByCreatedAtDesc(
            userId, RecommendationStatus.PENDING))
        .thenReturn(List.of(pendingRecommendation));

    RecommendationChangeSignalReader.Signals signals = reader.read(userId, null);

    assertThat(signals.hasWeaknessAnalysis()).isFalse();
    assertThat(signals.pendingRecommendations()).containsExactly(pendingRecommendation);
    verify(supplementRecommendationRepository)
        .findAllByUserIdAndStatusOrderByCreatedAtDesc(userId, RecommendationStatus.PENDING);
  }
}
