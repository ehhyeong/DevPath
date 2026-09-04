package com.devpath.domain.learning.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.learning.entity.recommendation.RecommendationHistory;
import com.devpath.domain.learning.entity.recommendation.RecommendationStatus;
import com.devpath.domain.learning.entity.recommendation.SupplementRecommendation;
import com.devpath.domain.learning.repository.recommendation.RecommendationHistoryRepository;
import com.devpath.domain.learning.repository.recommendation.SupplementRecommendationRepository;
import com.devpath.domain.roadmap.entity.RoadmapNode;
import com.devpath.domain.user.entity.User;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class SupplementRecommendationLifecycleServiceTest {

  @Mock private SupplementRecommendationRepository supplementRecommendationRepository;
  @Mock private RecommendationHistoryRepository recommendationHistoryRepository;
  @Mock private RoadmapNode roadmapNode;

  private SupplementRecommendationLifecycleService service;

  @BeforeEach
  void setUp() {
    service =
        new SupplementRecommendationLifecycleService(
            supplementRecommendationRepository, recommendationHistoryRepository);
  }

  @Test
  void approveChangesStatusAndRecordsHistory() {
    long userId = 7L;
    long recommendationId = 31L;
    SupplementRecommendation recommendation = recommendation(userId, recommendationId);
    when(supplementRecommendationRepository.findById(recommendationId))
        .thenReturn(Optional.of(recommendation));
    when(recommendationHistoryRepository.save(any(RecommendationHistory.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));

    SupplementRecommendation approved = service.approve(userId, recommendationId);

    ArgumentCaptor<RecommendationHistory> historyCaptor =
        ArgumentCaptor.forClass(RecommendationHistory.class);
    verify(recommendationHistoryRepository).save(historyCaptor.capture());
    assertThat(approved.getStatus()).isEqualTo(RecommendationStatus.APPROVED);
    assertThat(historyCaptor.getValue().getBeforeStatus()).isEqualTo("PENDING");
    assertThat(historyCaptor.getValue().getAfterStatus()).isEqualTo("APPROVED");
    assertThat(historyCaptor.getValue().getActionType()).isEqualTo("APPROVED");
  }

  @Test
  void recordCreatedStoresInitialPendingHistory() {
    SupplementRecommendation recommendation = recommendation(7L, 31L);
    when(recommendationHistoryRepository.save(any(RecommendationHistory.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));

    service.recordCreated(recommendation);

    ArgumentCaptor<RecommendationHistory> historyCaptor =
        ArgumentCaptor.forClass(RecommendationHistory.class);
    verify(recommendationHistoryRepository).save(historyCaptor.capture());
    assertThat(historyCaptor.getValue().getBeforeStatus()).isNull();
    assertThat(historyCaptor.getValue().getAfterStatus()).isEqualTo("PENDING");
    assertThat(historyCaptor.getValue().getActionType()).isEqualTo("CREATED");
    assertThat(historyCaptor.getValue().getContext()).isEqualTo("보충 학습 필요");
  }

  @Test
  void rejectDeniesRecommendationOwnedByAnotherUser() {
    long recommendationId = 31L;
    when(supplementRecommendationRepository.findById(recommendationId))
        .thenReturn(Optional.of(recommendation(8L, recommendationId)));

    assertThatThrownBy(() -> service.reject(7L, recommendationId))
        .isInstanceOf(CustomException.class)
        .extracting(exception -> ((CustomException) exception).getErrorCode())
        .isEqualTo(ErrorCode.FORBIDDEN);
  }

  private SupplementRecommendation recommendation(long userId, long recommendationId) {
    User user = User.builder().email("learner@devpath.com").password("encoded").name("학습자").build();
    ReflectionTestUtils.setField(user, "id", userId);
    SupplementRecommendation recommendation =
        SupplementRecommendation.builder()
            .user(user)
            .roadmapNode(roadmapNode)
            .reason("보충 학습 필요")
            .build();
    ReflectionTestUtils.setField(recommendation, "id", recommendationId);
    return recommendation;
  }
}
