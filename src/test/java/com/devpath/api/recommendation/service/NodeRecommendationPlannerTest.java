package com.devpath.api.recommendation.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.devpath.domain.learning.entity.LessonProgress;
import com.devpath.domain.learning.repository.LessonProgressRepository;
import com.devpath.domain.learning.repository.TilDraftRepository;
import com.devpath.domain.learning.repository.TimestampNoteRepository;
import com.devpath.domain.learning.repository.ocr.OcrResultRepository;
import com.devpath.domain.roadmap.entity.NodeRecommendation;
import com.devpath.domain.roadmap.entity.Roadmap;
import com.devpath.domain.roadmap.entity.RoadmapNode;
import com.devpath.domain.roadmap.repository.CustomRoadmapNodeRepository;
import com.devpath.domain.roadmap.repository.CustomRoadmapRepository;
import com.devpath.domain.roadmap.repository.NodeRequiredTagRepository;
import com.devpath.domain.user.repository.UserTechStackRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class NodeRecommendationPlannerTest {

  @Mock private NodeRequiredTagRepository nodeRequiredTagRepository;
  @Mock private UserTechStackRepository userTechStackRepository;
  @Mock private CustomRoadmapRepository customRoadmapRepository;
  @Mock private CustomRoadmapNodeRepository customRoadmapNodeRepository;
  @Mock private LessonProgressRepository lessonProgressRepository;
  @Mock private TimestampNoteRepository timestampNoteRepository;
  @Mock private TilDraftRepository tilDraftRepository;
  @Mock private OcrResultRepository ocrResultRepository;

  @InjectMocks private NodeRecommendationPlanner planner;

  private List<RoadmapNode> nodes;

  @BeforeEach
  void setUp() {
    Roadmap roadmap = Roadmap.builder().roadmapId(10L).title("Backend").build();
    nodes =
        List.of(
            RoadmapNode.builder()
                .nodeId(100L)
                .roadmap(roadmap)
                .title("Spring")
                .sortOrder(1)
                .build(),
            RoadmapNode.builder()
                .nodeId(200L)
                .roadmap(roadmap)
                .title("Docker")
                .sortOrder(2)
                .build());
    when(userTechStackRepository.findTagNamesByUserId(1L)).thenReturn(List.of());
    when(customRoadmapRepository.findByUserIdAndOriginalRoadmapRoadmapId(1L, 10L))
        .thenReturn(Optional.empty());
    when(nodeRequiredTagRepository.findTagNamesByNodeIds(List.of(100L, 200L)))
        .thenReturn(List.of());
  }

  @Test
  void plan_selectsAdvancedNodeWhenLearningMomentumIsHigh() {
    LessonProgress progress = LessonProgress.builder().build();
    progress.updateProgress(60, 600);
    when(lessonProgressRepository.findAllByUserId(1L)).thenReturn(List.of(progress));
    when(timestampNoteRepository.countByUserIdAndIsDeletedFalse(1L)).thenReturn(1L);
    when(tilDraftRepository.countByUserIdAndIsDeletedFalse(1L)).thenReturn(1L);
    when(ocrResultRepository.countByUserId(1L)).thenReturn(1L);

    NodeRecommendationPlanner.RecommendationPlan result = planner.plan(1L, 10L, nodes);

    assertThat(result.recommendations()).hasSize(1);
    assertThat(result.recommendations().get(0).type())
        .isEqualTo(NodeRecommendation.RecommendationType.ADVANCED);
    assertThat(result.recommendations().get(0).node()).isSameAs(nodes.get(0));
    assertThat(result.averageProgressPercent()).isEqualTo(60);
  }

  @Test
  void plan_fallsBackToOptionalNodeWithoutLearningSignals() {
    when(lessonProgressRepository.findAllByUserId(1L)).thenReturn(List.of());

    NodeRecommendationPlanner.RecommendationPlan result = planner.plan(1L, 10L, nodes);

    assertThat(result.recommendations()).hasSize(1);
    assertThat(result.recommendations().get(0).type())
        .isEqualTo(NodeRecommendation.RecommendationType.OPTIONAL);
    assertThat(result.recommendations().get(0).node()).isSameAs(nodes.get(0));
  }
}
