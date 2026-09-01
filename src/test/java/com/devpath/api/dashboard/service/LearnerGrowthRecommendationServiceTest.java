package com.devpath.api.dashboard.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.devpath.api.roadmap.service.CustomRoadmapPrerequisiteSyncService;
import com.devpath.domain.learning.repository.clearance.NodeClearanceRepository;
import com.devpath.domain.learning.repository.proof.ProofCardRepository;
import com.devpath.domain.learning.repository.proof.ProofCardTagRepository;
import com.devpath.domain.roadmap.repository.CustomRoadmapNodeRepository;
import com.devpath.domain.roadmap.repository.CustomRoadmapRepository;
import com.devpath.domain.roadmap.repository.NodeRequiredTagRepository;
import com.devpath.domain.roadmap.repository.RoadmapNodeRepository;
import com.devpath.domain.roadmap.service.RoadmapProgressService;
import com.devpath.domain.user.repository.UserRepository;
import com.devpath.domain.user.repository.UserTechStackRepository;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class LearnerGrowthRecommendationServiceTest {

  @Mock private ProofCardRepository proofCardRepository;
  @Mock private ProofCardTagRepository proofCardTagRepository;
  @Mock private NodeClearanceRepository nodeClearanceRepository;
  @Mock private UserRepository userRepository;
  @Mock private UserTechStackRepository userTechStackRepository;
  @Mock private RoadmapNodeRepository roadmapNodeRepository;
  @Mock private NodeRequiredTagRepository nodeRequiredTagRepository;
  @Mock private CustomRoadmapRepository customRoadmapRepository;
  @Mock private CustomRoadmapNodeRepository customRoadmapNodeRepository;
  @Mock private CustomRoadmapPrerequisiteSyncService prerequisiteSyncService;
  @Mock private RoadmapProgressService roadmapProgressService;

  @InjectMocks private LearnerGrowthRecommendationService service;

  @Test
  void returnsEmptyRecommendationWhenLearnerHasNoTags() {
    when(proofCardRepository.findAllByUserIdOrderByIssuedAtDesc(7L)).thenReturn(List.of());
    when(userTechStackRepository.findTagNamesByUserId(7L)).thenReturn(List.of());

    var response = service.getGrowthRecommendation(7L);

    assertThat(response.getRecommendations()).isEmpty();
    assertThat(response.getAnalysisText()).contains("학습 데이터");
  }
}
