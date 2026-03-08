package com.devpath.api.roadmap.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.roadmap.entity.CustomNodePrerequisite;
import com.devpath.domain.roadmap.entity.CustomRoadmap;
import com.devpath.domain.roadmap.entity.CustomRoadmapNode;
import com.devpath.domain.roadmap.entity.NodeStatus;
import com.devpath.domain.roadmap.entity.Roadmap;
import com.devpath.domain.roadmap.entity.RoadmapNode;
import com.devpath.domain.roadmap.port.OfficialRoadmapReader;
import com.devpath.domain.roadmap.port.OfficialRoadmapSnapshot;
import com.devpath.domain.roadmap.repository.CustomNodePrerequisiteRepository;
import com.devpath.domain.roadmap.repository.CustomRoadmapNodeRepository;
import com.devpath.domain.roadmap.repository.CustomRoadmapRepository;
import com.devpath.domain.roadmap.repository.NodeRequiredTagRepository;
import com.devpath.domain.roadmap.repository.RoadmapNodeRepository;
import com.devpath.domain.roadmap.repository.RoadmapRepository;
import com.devpath.domain.roadmap.service.TagValidationService;
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
@SuppressWarnings("unchecked")
class CustomRoadmapCopyServiceTest {

  @Mock private UserRepository userRepository;
  @Mock private RoadmapRepository roadmapRepository;
  @Mock private RoadmapNodeRepository roadmapNodeRepository;
  @Mock private CustomRoadmapRepository customRoadmapRepository;
  @Mock private CustomRoadmapNodeRepository customRoadmapNodeRepository;
  @Mock private CustomNodePrerequisiteRepository customNodePrerequisiteRepository;
  @Mock private OfficialRoadmapReader officialRoadmapReader;
  @Mock private UserTechStackRepository userTechStackRepository;
  @Mock private NodeRequiredTagRepository nodeRequiredTagRepository;

  private CustomRoadmapCopyService service;

  @BeforeEach
  void setUp() {
    service =
        new CustomRoadmapCopyService(
            userRepository,
            roadmapRepository,
            roadmapNodeRepository,
            customRoadmapRepository,
            customRoadmapNodeRepository,
            customNodePrerequisiteRepository,
            officialRoadmapReader,
            new TagValidationService(),
            userTechStackRepository,
            nodeRequiredTagRepository);

    lenient()
        .when(customRoadmapRepository.save(any(CustomRoadmap.class)))
        .thenAnswer(
            invocation -> {
              CustomRoadmap customRoadmap = invocation.getArgument(0);
              ReflectionTestUtils.setField(customRoadmap, "id", 99L);
              return customRoadmap;
            });
    lenient()
        .when(customRoadmapNodeRepository.saveAll(anyList()))
        .thenAnswer(invocation -> invocation.getArgument(0));
    lenient()
        .when(customNodePrerequisiteRepository.saveAll(anyList()))
        .thenAnswer(invocation -> invocation.getArgument(0));
  }

  @Test
  void copyToCustomRoadmap_marksQualifiedNodesCompleted() {
    Long userId = 1L;
    Long roadmapId = 10L;
    User user = createUser();
    Roadmap roadmap = createRoadmap(roadmapId, "Backend");
    RoadmapNode javaNode = createRoadmapNode(100L, roadmap, "Java");
    RoadmapNode dockerNode = createRoadmapNode(200L, roadmap, "Docker");
    OfficialRoadmapSnapshot snapshot =
        new OfficialRoadmapSnapshot(
            roadmapId,
            "Backend",
            List.of(
                new OfficialRoadmapSnapshot.NodeItem(100L, null, "Java", "desc", 2),
                new OfficialRoadmapSnapshot.NodeItem(200L, null, "Docker", "desc", 1)),
            List.of(new OfficialRoadmapSnapshot.PrerequisiteEdge(100L, 200L)));

    when(userRepository.findById(userId)).thenReturn(Optional.of(user));
    when(roadmapRepository.findByRoadmapIdAndIsOfficialTrueAndIsDeletedFalse(roadmapId))
        .thenReturn(Optional.of(roadmap));
    when(customRoadmapRepository.existsByUserIdAndOriginalRoadmapRoadmapId(userId, roadmapId))
        .thenReturn(false);
    when(officialRoadmapReader.loadSnapshot(roadmapId)).thenReturn(snapshot);
    when(roadmapNodeRepository.findAllById(anyList())).thenReturn(List.of(javaNode, dockerNode));
    when(userTechStackRepository.findTagNamesByUserId(userId))
        .thenReturn(List.of("Java", "Spring"));
    when(nodeRequiredTagRepository.findTagNamesByNodeIds(List.of(100L, 200L)))
        .thenReturn(
            List.of(
                projection(100L, "Java"), projection(100L, "Spring"), projection(200L, "Docker")));

    Long copiedRoadmapId = service.copyToCustomRoadmap(userId, roadmapId);

    assertThat(copiedRoadmapId).isEqualTo(99L);

    ArgumentCaptor<List<CustomRoadmapNode>> nodeCaptor = ArgumentCaptor.forClass(List.class);
    verify(customRoadmapNodeRepository).saveAll(nodeCaptor.capture());
    List<CustomRoadmapNode> savedNodes = nodeCaptor.getValue();

    assertThat(savedNodes).hasSize(2);
    assertThat(savedNodes.get(0).getOriginalNode().getNodeId()).isEqualTo(200L);
    assertThat(savedNodes.get(0).getStatus()).isEqualTo(NodeStatus.NOT_STARTED);
    assertThat(savedNodes.get(0).getCompletedAt()).isNull();
    assertThat(savedNodes.get(1).getOriginalNode().getNodeId()).isEqualTo(100L);
    assertThat(savedNodes.get(1).getStatus()).isEqualTo(NodeStatus.COMPLETED);
    assertThat(savedNodes.get(1).getCompletedAt()).isNotNull();

    ArgumentCaptor<List<CustomNodePrerequisite>> prerequisiteCaptor =
        ArgumentCaptor.forClass(List.class);
    verify(customNodePrerequisiteRepository).saveAll(prerequisiteCaptor.capture());
    assertThat(prerequisiteCaptor.getValue()).hasSize(1);
  }

  @Test
  void copyToCustomRoadmap_keepsNodeNotStartedWhenTagsAreMissing() {
    Long userId = 1L;
    Long roadmapId = 10L;
    User user = createUser();
    Roadmap roadmap = createRoadmap(roadmapId, "Backend");
    RoadmapNode springNode = createRoadmapNode(300L, roadmap, "Spring");
    OfficialRoadmapSnapshot snapshot =
        new OfficialRoadmapSnapshot(
            roadmapId,
            "Backend",
            List.of(new OfficialRoadmapSnapshot.NodeItem(300L, null, "Spring", "desc", 1)),
            List.of());

    when(userRepository.findById(userId)).thenReturn(Optional.of(user));
    when(roadmapRepository.findByRoadmapIdAndIsOfficialTrueAndIsDeletedFalse(roadmapId))
        .thenReturn(Optional.of(roadmap));
    when(customRoadmapRepository.existsByUserIdAndOriginalRoadmapRoadmapId(userId, roadmapId))
        .thenReturn(false);
    when(officialRoadmapReader.loadSnapshot(roadmapId)).thenReturn(snapshot);
    when(roadmapNodeRepository.findAllById(anyList())).thenReturn(List.of(springNode));
    when(userTechStackRepository.findTagNamesByUserId(userId)).thenReturn(List.of("Java"));
    when(nodeRequiredTagRepository.findTagNamesByNodeIds(List.of(300L)))
        .thenReturn(List.of(projection(300L, "Spring")));

    service.copyToCustomRoadmap(userId, roadmapId);

    ArgumentCaptor<List<CustomRoadmapNode>> nodeCaptor = ArgumentCaptor.forClass(List.class);
    verify(customRoadmapNodeRepository).saveAll(nodeCaptor.capture());
    CustomRoadmapNode savedNode = nodeCaptor.getValue().getFirst();

    assertThat(savedNode.getStatus()).isEqualTo(NodeStatus.NOT_STARTED);
    assertThat(savedNode.getCompletedAt()).isNull();
  }

  @Test
  void copyToCustomRoadmap_doesNotAutoCompleteNodeWithoutRequiredTags() {
    Long userId = 1L;
    Long roadmapId = 10L;
    User user = createUser();
    Roadmap roadmap = createRoadmap(roadmapId, "Backend");
    RoadmapNode introNode = createRoadmapNode(400L, roadmap, "Intro");
    OfficialRoadmapSnapshot snapshot =
        new OfficialRoadmapSnapshot(
            roadmapId,
            "Backend",
            List.of(new OfficialRoadmapSnapshot.NodeItem(400L, null, "Intro", "desc", 1)),
            List.of());

    when(userRepository.findById(userId)).thenReturn(Optional.of(user));
    when(roadmapRepository.findByRoadmapIdAndIsOfficialTrueAndIsDeletedFalse(roadmapId))
        .thenReturn(Optional.of(roadmap));
    when(customRoadmapRepository.existsByUserIdAndOriginalRoadmapRoadmapId(userId, roadmapId))
        .thenReturn(false);
    when(officialRoadmapReader.loadSnapshot(roadmapId)).thenReturn(snapshot);
    when(roadmapNodeRepository.findAllById(anyList())).thenReturn(List.of(introNode));
    when(userTechStackRepository.findTagNamesByUserId(userId))
        .thenReturn(List.of("Java", "Spring"));
    when(nodeRequiredTagRepository.findTagNamesByNodeIds(List.of(400L))).thenReturn(List.of());

    service.copyToCustomRoadmap(userId, roadmapId);

    ArgumentCaptor<List<CustomRoadmapNode>> nodeCaptor = ArgumentCaptor.forClass(List.class);
    verify(customRoadmapNodeRepository).saveAll(nodeCaptor.capture());
    CustomRoadmapNode savedNode = nodeCaptor.getValue().getFirst();

    assertThat(savedNode.getStatus()).isEqualTo(NodeStatus.NOT_STARTED);
    assertThat(savedNode.getCompletedAt()).isNull();
  }

  @Test
  void copyToCustomRoadmap_rejectsDuplicateCopyForSameUserAndRoadmap() {
    Long userId = 1L;
    Long roadmapId = 10L;

    when(userRepository.findById(userId)).thenReturn(Optional.of(createUser()));
    when(roadmapRepository.findByRoadmapIdAndIsOfficialTrueAndIsDeletedFalse(roadmapId))
        .thenReturn(Optional.of(createRoadmap(roadmapId, "Backend")));
    when(customRoadmapRepository.existsByUserIdAndOriginalRoadmapRoadmapId(userId, roadmapId))
        .thenReturn(true);

    assertThatThrownBy(() -> service.copyToCustomRoadmap(userId, roadmapId))
        .isInstanceOf(CustomException.class)
        .extracting("errorCode")
        .isEqualTo(ErrorCode.CUSTOM_ROADMAP_ALREADY_EXISTS);

    verify(customRoadmapRepository, never()).save(any(CustomRoadmap.class));
    verify(customRoadmapNodeRepository, never()).saveAll(anyList());
  }

  private User createUser() {
    return User.builder().email("user@test.com").password("pw").name("tester").build();
  }

  private Roadmap createRoadmap(Long roadmapId, String title) {
    return Roadmap.builder()
        .roadmapId(roadmapId)
        .title(title)
        .description("desc")
        .isOfficial(true)
        .isDeleted(false)
        .build();
  }

  private RoadmapNode createRoadmapNode(Long nodeId, Roadmap roadmap, String title) {
    return RoadmapNode.builder()
        .nodeId(nodeId)
        .roadmap(roadmap)
        .title(title)
        .content("content")
        .nodeType("STEP")
        .sortOrder(1)
        .build();
  }

  private NodeRequiredTagRepository.NodeRequiredTagNameProjection projection(
      Long nodeId, String tagName) {
    return new NodeRequiredTagRepository.NodeRequiredTagNameProjection() {
      @Override
      public Long getNodeId() {
        return nodeId;
      }

      @Override
      public String getTagName() {
        return tagName;
      }
    };
  }
}
