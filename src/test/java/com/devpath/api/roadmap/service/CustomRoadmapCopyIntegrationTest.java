package com.devpath.api.roadmap.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.reset;

import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.roadmap.entity.CustomRoadmap;
import com.devpath.domain.roadmap.entity.CustomRoadmapNode;
import com.devpath.domain.roadmap.entity.NodeRequiredTag;
import com.devpath.domain.roadmap.entity.NodeStatus;
import com.devpath.domain.roadmap.entity.Prerequisite;
import com.devpath.domain.roadmap.entity.Roadmap;
import com.devpath.domain.roadmap.entity.RoadmapNode;
import com.devpath.domain.roadmap.port.OfficialRoadmapReader;
import com.devpath.domain.roadmap.port.OfficialRoadmapSnapshot;
import com.devpath.domain.roadmap.repository.CustomNodePrerequisiteRepository;
import com.devpath.domain.roadmap.repository.CustomRoadmapNodeRepository;
import com.devpath.domain.roadmap.repository.CustomRoadmapRepository;
import com.devpath.domain.roadmap.repository.NodeRequiredTagRepository;
import com.devpath.domain.roadmap.repository.PrerequisiteRepository;
import com.devpath.domain.roadmap.repository.RoadmapNodeRepository;
import com.devpath.domain.roadmap.repository.RoadmapRepository;
import com.devpath.domain.user.entity.Tag;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.entity.UserTechStack;
import com.devpath.domain.user.repository.TagRepository;
import com.devpath.domain.user.repository.UserRepository;
import com.devpath.domain.user.repository.UserTechStackRepository;
import java.util.Comparator;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(
    properties = {
      "spring.datasource.url=jdbc:h2:mem:custom-roadmap-copy-test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DATABASE_TO_LOWER=TRUE"
    })
@ActiveProfiles("test")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class CustomRoadmapCopyIntegrationTest {

  @Autowired private CustomRoadmapCopyService customRoadmapCopyService;
  @Autowired private UserRepository userRepository;
  @Autowired private TagRepository tagRepository;
  @Autowired private UserTechStackRepository userTechStackRepository;
  @Autowired private RoadmapRepository roadmapRepository;
  @Autowired private RoadmapNodeRepository roadmapNodeRepository;
  @Autowired private PrerequisiteRepository prerequisiteRepository;
  @Autowired private NodeRequiredTagRepository nodeRequiredTagRepository;
  @Autowired private CustomRoadmapRepository customRoadmapRepository;
  @Autowired private CustomRoadmapNodeRepository customRoadmapNodeRepository;
  @Autowired private CustomNodePrerequisiteRepository customNodePrerequisiteRepository;

  @MockitoSpyBean private OfficialRoadmapReader officialRoadmapReader;

  @AfterEach
  void tearDown() {
    reset(officialRoadmapReader);
  }

  @Test
  @Transactional
  void copyToCustomRoadmap_completesNodesMatchingUserTags() {
    User user =
        userRepository.save(
            User.builder().email("copy@test.com").password("pw").name("copy-user").build());

    Tag javaTag = tagRepository.save(Tag.builder().name("Java").category("Backend").build());
    Tag springTag = tagRepository.save(Tag.builder().name("Spring").category("Backend").build());
    Tag dockerTag = tagRepository.save(Tag.builder().name("Docker").category("DevOps").build());

    userTechStackRepository.saveAll(
        List.of(
            UserTechStack.builder().user(user).tag(javaTag).build(),
            UserTechStack.builder().user(user).tag(springTag).build()));

    Roadmap roadmap =
        roadmapRepository.save(
            Roadmap.builder()
                .title("Backend")
                .description("official roadmap")
                .isOfficial(true)
                .isDeleted(false)
                .build());

    RoadmapNode javaNode =
        roadmapNodeRepository.save(
            RoadmapNode.builder()
                .roadmap(roadmap)
                .title("Java Basics")
                .content("java")
                .nodeType("STEP")
                .sortOrder(1)
                .build());
    RoadmapNode springNode =
        roadmapNodeRepository.save(
            RoadmapNode.builder()
                .roadmap(roadmap)
                .title("Spring Basics")
                .content("spring")
                .nodeType("STEP")
                .sortOrder(2)
                .build());
    RoadmapNode dockerNode =
        roadmapNodeRepository.save(
            RoadmapNode.builder()
                .roadmap(roadmap)
                .title("Docker")
                .content("docker")
                .nodeType("STEP")
                .sortOrder(3)
                .build());

    prerequisiteRepository.save(Prerequisite.builder().node(springNode).preNode(javaNode).build());
    prerequisiteRepository.save(
        Prerequisite.builder().node(dockerNode).preNode(springNode).build());

    nodeRequiredTagRepository.saveAll(
        List.of(
            NodeRequiredTag.builder().node(javaNode).tag(javaTag).build(),
            NodeRequiredTag.builder().node(springNode).tag(springTag).build(),
            NodeRequiredTag.builder().node(dockerNode).tag(dockerTag).build()));

    Long customRoadmapId =
        customRoadmapCopyService.copyToCustomRoadmap(user.getId(), roadmap.getRoadmapId());

    CustomRoadmap customRoadmap = customRoadmapRepository.findById(customRoadmapId).orElseThrow();
    List<CustomRoadmapNode> copiedNodes =
        customRoadmapNodeRepository.findAllByCustomRoadmap(customRoadmap).stream()
            .sorted(Comparator.comparing(node -> node.getOriginalNode().getSortOrder()))
            .toList();

    assertThat(copiedNodes).hasSize(3);
    assertThat(copiedNodes.get(0).getStatus()).isEqualTo(NodeStatus.COMPLETED);
    assertThat(copiedNodes.get(1).getStatus()).isEqualTo(NodeStatus.COMPLETED);
    assertThat(copiedNodes.get(2).getStatus()).isEqualTo(NodeStatus.NOT_STARTED);
    assertThat(customNodePrerequisiteRepository.findAllByCustomRoadmap(customRoadmap)).hasSize(2);
  }

  @Test
  void copyToCustomRoadmap_rollsBackWhenSnapshotContainsUnknownNode() {
    User user =
        userRepository.save(
            User.builder().email("rollback@test.com").password("pw").name("rollback-user").build());

    Roadmap roadmap =
        roadmapRepository.save(
            Roadmap.builder()
                .title("Broken")
                .description("official roadmap")
                .isOfficial(true)
                .isDeleted(false)
                .build());

    RoadmapNode existingNode =
        roadmapNodeRepository.save(
            RoadmapNode.builder()
                .roadmap(roadmap)
                .title("Existing")
                .content("content")
                .nodeType("STEP")
                .sortOrder(1)
                .build());

    doReturn(
            new OfficialRoadmapSnapshot(
                roadmap.getRoadmapId(),
                roadmap.getTitle(),
                List.of(
                    new OfficialRoadmapSnapshot.NodeItem(
                        existingNode.getNodeId(), null, "Existing", "content", 1),
                    new OfficialRoadmapSnapshot.NodeItem(999999L, null, "Missing", "content", 2)),
                List.of()))
        .when(officialRoadmapReader)
        .loadSnapshot(roadmap.getRoadmapId());

    assertThatThrownBy(
            () ->
                customRoadmapCopyService.copyToCustomRoadmap(user.getId(), roadmap.getRoadmapId()))
        .isInstanceOf(CustomException.class)
        .extracting("errorCode")
        .isEqualTo(ErrorCode.ROADMAP_NODE_NOT_FOUND);

    assertThat(
            customRoadmapRepository.countByUserIdAndOriginalRoadmapRoadmapId(
                user.getId(), roadmap.getRoadmapId()))
        .isZero();
    assertThat(customRoadmapNodeRepository.findAll()).isEmpty();
  }
}
