package com.devpath.domain.roadmap.service;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.devpath.domain.roadmap.entity.CustomRoadmap;
import com.devpath.domain.roadmap.entity.CustomRoadmapNode;
import com.devpath.domain.roadmap.repository.CustomNodePrerequisiteRepository;
import com.devpath.domain.roadmap.repository.CustomRoadmapNodeRepository;
import com.devpath.domain.roadmap.repository.CustomRoadmapRepository;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class CustomRoadmapNodeCommandServiceTest {

  @Mock private CustomRoadmapRepository customRoadmapRepository;
  @Mock private CustomRoadmapNodeRepository customRoadmapNodeRepository;
  @Mock private CustomNodePrerequisiteRepository customNodePrerequisiteRepository;
  @Mock private RoadmapProgressService roadmapProgressService;
  @Mock private CustomRoadmapPrerequisiteSyncService prerequisiteSyncService;
  @Mock private CustomRoadmap customRoadmap;
  @Mock private CustomRoadmapNode movedNode;
  @Mock private CustomRoadmapNode anchorNode;
  @Mock private CustomRoadmapNode trailingNode;

  private CustomRoadmapNodeCommandService service;

  @BeforeEach
  void setUp() {
    service =
        new CustomRoadmapNodeCommandService(
            customRoadmapRepository,
            customRoadmapNodeRepository,
            customNodePrerequisiteRepository,
            roadmapProgressService,
            prerequisiteSyncService);
  }

  @Test
  void reorderAfterPlacesMovedNodeImmediatelyAfterAnchorAndRebuildsPrerequisites() {
    when(movedNode.getId()).thenReturn(11L);
    when(anchorNode.getId()).thenReturn(22L);
    when(trailingNode.getId()).thenReturn(33L);
    when(customRoadmapNodeRepository.findAllByCustomRoadmapOrderByCustomSortOrderAsc(customRoadmap))
        .thenReturn(List.of(movedNode, anchorNode, trailingNode));

    service.reorderAfter(customRoadmap, movedNode, anchorNode);

    verify(anchorNode).changeCustomSortOrder(1);
    verify(movedNode).changeCustomSortOrder(2);
    verify(trailingNode).changeCustomSortOrder(3);
    verify(prerequisiteSyncService).relayoutAndRebuild(customRoadmap);
    verify(customRoadmap).markPrerequisitesCustomized();
  }
}
