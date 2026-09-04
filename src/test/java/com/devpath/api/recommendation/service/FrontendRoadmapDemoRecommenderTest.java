package com.devpath.api.recommendation.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.devpath.domain.learning.entity.recommendation.RecommendationChange;
import com.devpath.domain.learning.entity.recommendation.RecommendationChangeStatus;
import com.devpath.domain.learning.repository.recommendation.RecommendationChangeRepository;
import com.devpath.domain.roadmap.entity.RoadmapNode;
import com.devpath.domain.roadmap.repository.RoadmapNodeRepository;
import com.devpath.domain.roadmap.service.SystemDynamicRoadmapProvider;
import com.devpath.domain.user.entity.User;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

class FrontendRoadmapDemoRecommenderTest {

  private final RoadmapNodeRepository roadmapNodeRepository = mock(RoadmapNodeRepository.class);
  private final RecommendationChangeRepository recommendationChangeRepository =
      mock(RecommendationChangeRepository.class);
  private final FrontendRoadmapDemoRecommender recommender =
      new FrontendRoadmapDemoRecommender(
          roadmapNodeRepository,
          recommendationChangeRepository,
          mock(SystemDynamicRoadmapProvider.class));

  @Test
  void supportsOnlyConfiguredFrontendDemoScenario() {
    User demoUser =
        User.builder().email("kim.hakseup@devpath.com").password("encoded").name("학습자").build();
    User regularUser =
        User.builder().email("learner@devpath.com").password("encoded").name("학습자").build();
    RoadmapNode frontendNode = RoadmapNode.builder().title("HTML CSS JavaScript 기초").build();
    List<String> requiredTags = List.of("HTML", "CSS", "JavaScript", "Vite");

    assertThat(recommender.supports(demoUser, frontendNode, requiredTags)).isTrue();
    assertThat(recommender.score()).isEqualTo(85);
    assertThat(recommender.supports(regularUser, frontendNode, requiredTags)).isFalse();
    assertThat(recommender.supports(demoUser, frontendNode, List.of("HTML", "CSS"))).isFalse();
  }

  @Test
  void reusesExistingDemoRecommendationAndRefreshesItsTitle() {
    User demoUser =
        User.builder().email("kim.hakseup@devpath.com").password("encoded").name("학습자").build();
    ReflectionTestUtils.setField(demoUser, "id", 7L);
    RoadmapNode clearedNode =
        RoadmapNode.builder().nodeId(31L).title("HTML CSS JavaScript 기초").build();
    RoadmapNode existingNode =
        RoadmapNode.builder()
            .nodeId(99L)
            .title("[Advanced] Rendering Performance Debugging")
            .build();
    RecommendationChange existingChange =
        RecommendationChange.builder().user(demoUser).roadmapNode(existingNode).build();
    when(recommendationChangeRepository.findAllByUserIdAndChangeStatusOrderByCreatedAtDesc(
            7L, RecommendationChangeStatus.SUGGESTED))
        .thenReturn(List.of(existingChange));

    List<Long> recommendedNodeIds = recommender.recommend(demoUser, clearedNode, null, null, false);

    assertThat(recommendedNodeIds).containsExactly(99L);
    assertThat(existingNode.getTitle()).isEqualTo("[심화] 렌더링 성능 디버깅");
    verifyNoInteractions(roadmapNodeRepository);
  }
}
