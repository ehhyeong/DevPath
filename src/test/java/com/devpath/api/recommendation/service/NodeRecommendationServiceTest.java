package com.devpath.api.recommendation.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.devpath.api.roadmap.service.CustomRoadmapCopyService;
import com.devpath.api.roadmap.service.CustomRoadmapPrerequisiteSyncService;
import com.devpath.domain.learning.entity.recommendation.RecommendationHistory;
import com.devpath.domain.learning.entity.recommendation.RiskWarning;
import com.devpath.domain.learning.entity.recommendation.SupplementRecommendation;
import com.devpath.domain.learning.repository.LessonProgressRepository;
import com.devpath.domain.learning.repository.TilDraftRepository;
import com.devpath.domain.learning.repository.TimestampNoteRepository;
import com.devpath.domain.learning.repository.ocr.OcrResultRepository;
import com.devpath.domain.learning.repository.recommendation.RecommendationHistoryRepository;
import com.devpath.domain.learning.repository.recommendation.RiskWarningRepository;
import com.devpath.domain.learning.repository.recommendation.SupplementRecommendationRepository;
import com.devpath.domain.learning.service.LearningAutomationPolicyService;
import com.devpath.domain.roadmap.entity.CustomRoadmap;
import com.devpath.domain.roadmap.entity.NodeRecommendation;
import com.devpath.domain.roadmap.entity.RecommendationStatus;
import com.devpath.domain.roadmap.entity.Roadmap;
import com.devpath.domain.roadmap.entity.RoadmapNode;
import com.devpath.domain.roadmap.repository.CustomRoadmapNodeRepository;
import com.devpath.domain.roadmap.repository.CustomRoadmapRepository;
import com.devpath.domain.roadmap.repository.NodeRecommendationRepository;
import com.devpath.domain.roadmap.repository.NodeRequiredTagRepository;
import com.devpath.domain.roadmap.repository.RoadmapNodeRepository;
import com.devpath.domain.roadmap.repository.RoadmapRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import com.devpath.domain.user.repository.UserTechStackRepository;
import java.time.LocalDateTime;
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
class NodeRecommendationServiceTest {

  @Mock private NodeRecommendationRepository nodeRecommendationRepository;
  @Mock private UserRepository userRepository;
  @Mock private RoadmapRepository roadmapRepository;
  @Mock private RoadmapNodeRepository roadmapNodeRepository;
  @Mock private NodeRequiredTagRepository nodeRequiredTagRepository;
  @Mock private UserTechStackRepository userTechStackRepository;
  @Mock private CustomRoadmapRepository customRoadmapRepository;
  @Mock private CustomRoadmapNodeRepository customRoadmapNodeRepository;
  @Mock private CustomRoadmapPrerequisiteSyncService prerequisiteSyncService;
  @Mock private CustomRoadmapCopyService customRoadmapCopyService;
  @Mock private RecommendationHistoryRepository recommendationHistoryRepository;
  @Mock private RiskWarningRepository riskWarningRepository;
  @Mock private SupplementRecommendationRepository supplementRecommendationRepository;
  @Mock private LessonProgressRepository lessonProgressRepository;
  @Mock private TimestampNoteRepository timestampNoteRepository;
  @Mock private TilDraftRepository tilDraftRepository;
  @Mock private OcrResultRepository ocrResultRepository;
  @Mock private LearningAutomationPolicyService learningAutomationPolicyService;

  private NodeRecommendationService service;

  private User user;
  private Roadmap roadmap;
  private RoadmapNode node;

  @BeforeEach
  void setUp() {
    NodeRecommendationPlanner recommendationPlanner =
        new NodeRecommendationPlanner(
            nodeRequiredTagRepository,
            userTechStackRepository,
            customRoadmapRepository,
            customRoadmapNodeRepository,
            lessonProgressRepository,
            timestampNoteRepository,
            tilDraftRepository,
            ocrResultRepository,
            learningAutomationPolicyService);
    NodeRecommendationArtifacts recommendationArtifacts =
        new NodeRecommendationArtifacts(
            recommendationHistoryRepository,
            riskWarningRepository,
            supplementRecommendationRepository);
    service =
        new NodeRecommendationService(
            nodeRecommendationRepository,
            userRepository,
            roadmapRepository,
            roadmapNodeRepository,
            customRoadmapRepository,
            customRoadmapNodeRepository,
            prerequisiteSyncService,
            customRoadmapCopyService,
            recommendationPlanner,
            recommendationArtifacts);
    user = User.builder().email("learner@example.com").password("encoded").name("학습자").build();
    ReflectionTestUtils.setField(user, "id", 1L);
    roadmap = Roadmap.builder().roadmapId(10L).title("Backend").build();
    node = RoadmapNode.builder().nodeId(100L).roadmap(roadmap).title("Spring").sortOrder(1).build();
  }

  @Test
  void generateRecommendations_createsRemedialArtifactsForMissingSkill() {
    NodeRequiredTagRepository.NodeRequiredTagNameProjection requiredTag =
        mock(NodeRequiredTagRepository.NodeRequiredTagNameProjection.class);
    when(requiredTag.getNodeId()).thenReturn(node.getNodeId());
    when(requiredTag.getTagName()).thenReturn("Java");
    when(userRepository.findById(1L)).thenReturn(Optional.of(user));
    when(roadmapRepository.findById(10L)).thenReturn(Optional.of(roadmap));
    when(nodeRecommendationRepository.findByUser_IdAndRoadmap_RoadmapIdAndStatus(
            1L, 10L, RecommendationStatus.PENDING))
        .thenReturn(List.of());
    when(roadmapNodeRepository.findByRoadmapOrderBySortOrderAsc(roadmap)).thenReturn(List.of(node));
    when(userTechStackRepository.findTagNamesByUserId(1L)).thenReturn(List.of());
    when(customRoadmapRepository.findByUserIdAndOriginalRoadmapRoadmapId(1L, 10L))
        .thenReturn(Optional.empty());
    when(lessonProgressRepository.findAllByUserId(1L)).thenReturn(List.of());
    when(nodeRequiredTagRepository.findTagNamesByNodeIds(List.of(100L)))
        .thenReturn(List.of(requiredTag));
    when(nodeRecommendationRepository.save(any(NodeRecommendation.class)))
        .thenAnswer(
            invocation -> {
              NodeRecommendation recommendation = invocation.getArgument(0);
              ReflectionTestUtils.setField(recommendation, "recommendationId", 500L);
              return recommendation;
            });

    List<NodeRecommendation> result = service.generateRecommendations(1L, 10L);

    assertThat(result).hasSize(1);
    assertThat(result.get(0).getRecommendationType())
        .isEqualTo(NodeRecommendation.RecommendationType.REMEDIAL);
    assertThat(result.get(0).getRecommendedNode()).isSameAs(node);
    ArgumentCaptor<SupplementRecommendation> supplementCaptor =
        ArgumentCaptor.forClass(SupplementRecommendation.class);
    verify(supplementRecommendationRepository).save(supplementCaptor.capture());
    assertThat(supplementCaptor.getValue().getCoveragePercent()).isZero();
    assertThat(supplementCaptor.getValue().getMissingTagCount()).isEqualTo(1);
    ArgumentCaptor<RiskWarning> warningCaptor = ArgumentCaptor.forClass(RiskWarning.class);
    verify(riskWarningRepository).save(warningCaptor.capture());
    assertThat(warningCaptor.getValue().getWarningType()).isEqualTo("LOW_LEARNING_PROGRESS");
    ArgumentCaptor<RecommendationHistory> historyCaptor =
        ArgumentCaptor.forClass(RecommendationHistory.class);
    verify(recommendationHistoryRepository).save(historyCaptor.capture());
    assertThat(historyCaptor.getValue().getActionType()).isEqualTo("GENERATED");
  }

  @Test
  void acceptRecommendation_addsNodeAndApprovesSupplement() {
    NodeRecommendation recommendation = createRecommendation(500L);
    CustomRoadmap customRoadmap =
        CustomRoadmap.builder().user(user).originalRoadmap(roadmap).title("내 Backend").build();
    SupplementRecommendation supplement = createSupplementRecommendation();
    when(userRepository.findById(1L)).thenReturn(Optional.of(user));
    when(nodeRecommendationRepository.findByRecommendationIdAndUser_Id(500L, 1L))
        .thenReturn(Optional.of(recommendation));
    when(customRoadmapRepository.findByUserIdAndOriginalRoadmapRoadmapId(1L, 10L))
        .thenReturn(Optional.of(customRoadmap));
    when(customRoadmapNodeRepository.findByCustomRoadmapAndOriginalNode(customRoadmap, node))
        .thenReturn(Optional.empty());
    when(supplementRecommendationRepository.findTopByUserIdAndRoadmapNodeNodeIdOrderByCreatedAtDesc(
            1L, 100L))
        .thenReturn(Optional.of(supplement));

    NodeRecommendation result = service.acceptRecommendation(1L, 500L);

    assertThat(result.getStatus()).isEqualTo(RecommendationStatus.ACCEPTED);
    assertThat(supplement.getStatus())
        .isEqualTo(com.devpath.domain.learning.entity.recommendation.RecommendationStatus.APPROVED);
    verify(customRoadmapNodeRepository).save(any());
    verify(prerequisiteSyncService).ensurePrerequisites(customRoadmap);
  }

  @Test
  void rejectRecommendation_rejectsSupplement() {
    NodeRecommendation recommendation = createRecommendation(500L);
    SupplementRecommendation supplement = createSupplementRecommendation();
    when(userRepository.findById(1L)).thenReturn(Optional.of(user));
    when(nodeRecommendationRepository.findByRecommendationIdAndUser_Id(500L, 1L))
        .thenReturn(Optional.of(recommendation));
    when(supplementRecommendationRepository.findTopByUserIdAndRoadmapNodeNodeIdOrderByCreatedAtDesc(
            1L, 100L))
        .thenReturn(Optional.of(supplement));

    NodeRecommendation result = service.rejectRecommendation(1L, 500L);

    assertThat(result.getStatus()).isEqualTo(RecommendationStatus.REJECTED);
    assertThat(supplement.getStatus())
        .isEqualTo(com.devpath.domain.learning.entity.recommendation.RecommendationStatus.REJECTED);
  }

  private NodeRecommendation createRecommendation(Long recommendationId) {
    NodeRecommendation recommendation =
        NodeRecommendation.builder()
            .user(user)
            .roadmap(roadmap)
            .recommendedNode(node)
            .recommendationType(NodeRecommendation.RecommendationType.REMEDIAL)
            .reason("필수 태그가 부족합니다.")
            .priority(1)
            .expiresAt(LocalDateTime.now().plusDays(1))
            .build();
    ReflectionTestUtils.setField(recommendation, "recommendationId", recommendationId);
    return recommendation;
  }

  private SupplementRecommendation createSupplementRecommendation() {
    return SupplementRecommendation.builder()
        .user(user)
        .roadmapNode(node)
        .reason("필수 태그가 부족합니다.")
        .priority(1)
        .coveragePercent(0.0)
        .missingTagCount(1)
        .build();
  }
}
