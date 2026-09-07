package com.devpath.domain.roadmap.service;

import com.devpath.domain.roadmap.entity.BranchKind;
import com.devpath.domain.roadmap.entity.RoadmapNode;
import com.devpath.domain.roadmap.repository.RoadmapNodeRepository;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 공식 로드맵 노드의 레인 필드를 다시 계산한다. 관리자는 정렬 순서와 갈래 번호(laneKey)만 입력하고,
 * 나머지(branchKind·orderInLane·anchorNodeId)는 여기서 파생한다.
 *
 * <p>규칙: 갈래 번호가 없으면 척추, 있으면 분기다. 분기 레인의 앵커는 그 레인이 시작되기 직전의 척추 노드이며 레인 구성원 전체가 공유한다. 커스텀 로드맵의 {@link
 * CustomRoadmapPrerequisiteSyncService#assignPositionalLanes}와 같은 규칙이고, 시드 말미의 파생 SQL도 이 규칙을 따른다.
 */
@Service
@RequiredArgsConstructor
public class OfficialRoadmapLaneSyncService {

  private final RoadmapNodeRepository roadmapNodeRepository;

  @Transactional
  public void resync(Long roadmapId) {
    List<RoadmapNode> ordered =
        roadmapNodeRepository.findAllByRoadmapRoadmapId(roadmapId).stream()
            .filter(node -> node.getSortOrder() != null)
            .sorted(
                Comparator.comparing(RoadmapNode::getSortOrder)
                    .thenComparing(RoadmapNode::getNodeId))
            .toList();

    RoadmapNode lastSpine = null;
    int spineOrder = 0;
    Map<String, Integer> laneOrderCounters = new HashMap<>();

    for (RoadmapNode node : ordered) {
      Integer laneKey = node.getLaneKey();
      if (laneKey == null) {
        node.assignLane(BranchKind.SPINE, null, null, spineOrder);
        spineOrder += 1;
        lastSpine = node;
      } else {
        Long anchorNodeId = lastSpine == null ? null : lastSpine.getNodeId();
        int orderInLane =
            laneOrderCounters.merge(anchorNodeId + ":" + laneKey, 1, Integer::sum) - 1;
        node.assignLane(BranchKind.BRANCH, anchorNodeId, laneKey, orderInLane);
      }
    }
  }
}
