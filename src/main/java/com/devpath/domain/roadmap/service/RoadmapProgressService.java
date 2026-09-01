package com.devpath.domain.roadmap.service;

import com.devpath.domain.roadmap.entity.CustomRoadmap;
import com.devpath.domain.roadmap.entity.CustomRoadmapNode;
import com.devpath.domain.roadmap.entity.NodeStatus;
import java.util.Collection;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class RoadmapProgressService {

  public int calculateProgressRate(Collection<CustomRoadmapNode> nodes) {
    if (nodes == null || nodes.isEmpty()) {
      return 0;
    }

    // 심화/복습(REVIEW/ADVANCED)은 선택 학습이라 진행률에서 제외한다. 척추·갈림길(BRANCH)·일반 추가노드는 포함.
    List<CustomRoadmapNode> counted =
        nodes.stream().filter(node -> !node.isRelearnGated()).toList();
    if (counted.isEmpty()) {
      return 0;
    }

    long completedCount =
        counted.stream().filter(node -> node.getStatus() == NodeStatus.COMPLETED).count();
    return (int) (completedCount * 100 / counted.size());
  }

  public int updateProgressRate(CustomRoadmap customRoadmap, Collection<CustomRoadmapNode> nodes) {
    int progressRate = calculateProgressRate(nodes);
    customRoadmap.updateProgressRate(progressRate);
    return progressRate;
  }
}
