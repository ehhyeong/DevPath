package com.devpath.domain.roadmap.repository;

import com.devpath.domain.roadmap.entity.Roadmap;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RoadmapRepository extends JpaRepository<Roadmap, Long> {
  Optional<Roadmap> findByRoadmapIdAndIsDeletedFalse(Long roadmapId);

  List<Roadmap> findAllByIsOfficialTrueAndIsDeletedFalse();

  // 관리자 허브 편집기에서 연결 가능한 공식 로드맵 목록을 제목순으로 읽어 온다.
  List<Roadmap> findAllByIsOfficialTrueAndIsDeletedFalseOrderByTitleAsc();

  Optional<Roadmap> findByRoadmapIdAndIsOfficialTrueAndIsDeletedFalse(Long roadmapId);

  // TASK-39: AI 동적 노드 보관용 시스템 로드맵을 제목으로 조회한다.
  Optional<Roadmap> findFirstByTitle(String title);
}
