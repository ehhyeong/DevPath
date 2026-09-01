package com.devpath.api.learner.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.devpath.api.learner.component.CourseScoreAnalyzer;
import com.devpath.common.provider.GeminiProvider;
import com.devpath.domain.learning.entity.recommendation.NodeChangeType;
import com.devpath.domain.learning.entity.recommendation.RecommendationChange;
import com.devpath.domain.learning.repository.proof.ProofCardRepository;
import com.devpath.domain.learning.repository.recommendation.RecommendationChangeRepository;
import com.devpath.domain.roadmap.entity.Roadmap;
import com.devpath.domain.roadmap.entity.RoadmapNode;
import com.devpath.domain.roadmap.repository.CustomRoadmapNodeRepository;
import com.devpath.domain.roadmap.repository.CustomRoadmapRepository;
import com.devpath.domain.roadmap.repository.NodeRequiredTagRepository;
import com.devpath.domain.roadmap.repository.RoadmapNodeRepository;
import com.devpath.domain.roadmap.service.SystemDynamicRoadmapProvider;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import com.devpath.domain.user.repository.UserTechStackRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class DiagnosisRecommendationServiceTest {

  @Mock private RoadmapNodeRepository roadmapNodeRepository;
  @Mock private UserRepository userRepository;
  @Mock private NodeRequiredTagRepository nodeRequiredTagRepository;
  @Mock private RecommendationChangeRepository recommendationChangeRepository;
  @Mock private SystemDynamicRoadmapProvider systemDynamicRoadmapProvider;
  @Mock private GeminiProvider geminiProvider;
  @Mock private CustomRoadmapRepository customRoadmapRepository;
  @Mock private CustomRoadmapNodeRepository customRoadmapNodeRepository;
  @Mock private UserTechStackRepository userTechStackRepository;
  @Mock private ProofCardRepository proofCardRepository;
  @Mock private CourseScoreAnalyzer courseScoreAnalyzer;

  private DiagnosisRecommendationService diagnosisRecommendationService;

  @BeforeEach
  void setUp() {
    diagnosisRecommendationService =
        new DiagnosisRecommendationService(
            roadmapNodeRepository,
            userRepository,
            nodeRequiredTagRepository,
            recommendationChangeRepository,
            systemDynamicRoadmapProvider,
            new DiagnosisRecommendationAiClient(geminiProvider, nodeRequiredTagRepository),
            customRoadmapRepository,
            customRoadmapNodeRepository,
            userTechStackRepository,
            proofCardRepository,
            courseScoreAnalyzer);
  }

  @Test
  void recommendForQuizCreatesReviewFallbackWhenGeminiReturnsNoResponse() {
    long userId = 7L;
    long roadmapId = 12L;
    long nodeId = 31L;
    User user = user(userId);
    Roadmap roadmap = Roadmap.builder().roadmapId(roadmapId).title("백엔드 로드맵").build();
    RoadmapNode clearedNode =
        RoadmapNode.builder()
            .nodeId(nodeId)
            .roadmap(roadmap)
            .title("Spring 트랜잭션")
            .sortOrder(3)
            .build();
    CourseScoreAnalyzer.CourseScores scores =
        new CourseScoreAnalyzer.CourseScores(
            List.of(new CourseScoreAnalyzer.CourseScore("Spring", 50)), 50.0, true);
    when(userRepository.findById(userId)).thenReturn(Optional.of(user));
    when(roadmapNodeRepository.findById(nodeId)).thenReturn(Optional.of(clearedNode));
    when(nodeRequiredTagRepository.findTagNamesByNodeId(nodeId))
        .thenReturn(List.of("Spring", "Transaction"));
    when(customRoadmapRepository.findByUserIdAndOriginalRoadmapRoadmapId(userId, roadmapId))
        .thenReturn(Optional.empty());
    when(proofCardRepository.countByUserId(userId)).thenReturn(0L);
    when(userTechStackRepository.findTagNamesByUserId(userId)).thenReturn(List.of());
    when(geminiProvider.generateJson(anyString(), anyMap(), anyInt())).thenReturn(null);
    when(roadmapNodeRepository.save(any(RoadmapNode.class)))
        .thenAnswer(
            invocation -> {
              RoadmapNode generated = invocation.getArgument(0);
              ReflectionTestUtils.setField(generated, "nodeId", 99L);
              return generated;
            });
    when(recommendationChangeRepository.save(any(RecommendationChange.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));

    DiagnosisRecommendationService.RecommendationResult result =
        diagnosisRecommendationService.recommendForQuiz(userId, nodeId, roadmapId, scores);

    ArgumentCaptor<RecommendationChange> changeCaptor =
        ArgumentCaptor.forClass(RecommendationChange.class);
    verify(recommendationChangeRepository).save(changeCaptor.capture());
    assertThat(result.score()).isEqualTo(50);
    assertThat(result.recommendedNodes()).isEqualTo("99");
    assertThat(changeCaptor.getValue().getNodeChangeType()).isEqualTo(NodeChangeType.ADD);
    assertThat(changeCaptor.getValue().getBranchFromNodeId()).isEqualTo(nodeId);
    assertThat(changeCaptor.getValue().getRoadmapNode().getTitle()).isEqualTo("[복습] Spring 트랜잭션");
  }

  private User user(long userId) {
    User user = User.builder().email("learner@devpath.com").password("encoded").name("학습자").build();
    ReflectionTestUtils.setField(user, "id", userId);
    return user;
  }
}
