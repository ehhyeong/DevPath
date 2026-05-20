package com.devpath.domain.builder.repository;

import com.devpath.domain.builder.entity.MyRoadmap;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MyRoadmapRepository extends JpaRepository<MyRoadmap, Long> {

  // 목록 조회: modules 로드 없이 count만 집계 (N+1 방지)
  @Query(
      "SELECT m.myRoadmapId AS myRoadmapId, m.title AS title, "
          + "m.createdAt AS createdAt, COUNT(mm) AS moduleCount "
          + "FROM MyRoadmap m LEFT JOIN m.modules mm "
          + "WHERE m.user.id = :userId "
          + "GROUP BY m.myRoadmapId, m.title, m.createdAt "
          + "ORDER BY m.createdAt DESC")
  List<MyRoadmapSummaryProjection> findSummariesByUserId(@Param("userId") Long userId);

  // 단건 조회: modules + builderModule JOIN FETCH (N+1 방지)
  @Query(
      "SELECT DISTINCT m FROM MyRoadmap m "
          + "LEFT JOIN FETCH m.modules mm "
          + "LEFT JOIN FETCH mm.builderModule "
          + "WHERE m.myRoadmapId = :id AND m.user.id = :userId")
  Optional<MyRoadmap> findByIdWithModules(@Param("id") Long id, @Param("userId") Long userId);

  // customRoadmapId → myRoadmapId 매핑 (목록 조회 시 빌더 로드맵 편집 링크용)
  @Query("SELECT m FROM MyRoadmap m WHERE m.user.id = :userId AND m.customRoadmapId IS NOT NULL")
  List<MyRoadmap> findAllWithCustomRoadmapIdByUserId(@Param("userId") Long userId);

  // 연결이 없는 기존 MyRoadmap 목록 (마이그레이션용)
  @Query("SELECT m FROM MyRoadmap m WHERE m.user.id = :userId AND m.customRoadmapId IS NULL")
  List<MyRoadmap> findAllByUserIdAndCustomRoadmapIdIsNull(@Param("userId") Long userId);

  default Map<Long, Long> buildCustomToMyRoadmapIdMap(Long userId) {
    return findAllWithCustomRoadmapIdByUserId(userId).stream()
        .filter(m -> m.getCustomRoadmapId() != null)
        .collect(Collectors.toMap(MyRoadmap::getCustomRoadmapId, MyRoadmap::getMyRoadmapId));
  }

  interface MyRoadmapSummaryProjection {
    Long getMyRoadmapId();

    String getTitle();

    LocalDateTime getCreatedAt();

    Long getModuleCount();
  }
}
