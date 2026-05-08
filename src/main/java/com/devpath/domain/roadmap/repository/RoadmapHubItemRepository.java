package com.devpath.domain.roadmap.repository;

import com.devpath.domain.roadmap.entity.RoadmapHubItem;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RoadmapHubItemRepository extends JpaRepository<RoadmapHubItem, Long> {

  // 허브 아이템을 섹션별 정렬 상태 그대로 읽어 오고 연결 로드맵도 같이 가져온다.
  @EntityGraph(attributePaths = "linkedRoadmap")
  List<RoadmapHubItem> findAllBySectionIdInOrderBySectionIdAscSortOrderAscIdAsc(
      Collection<Long> sectionIds);
}
