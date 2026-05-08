package com.devpath.domain.builder.repository;

import com.devpath.api.builder.dto.MyRoadmapSummary;
import com.devpath.domain.builder.entity.MyRoadmap;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MyRoadmapRepository extends JpaRepository<MyRoadmap, Long> {

  // 목록 조회: modules 로드 없이 count만 집계 (N+1 방지)
  @Query(
      "SELECT new com.devpath.api.builder.dto.MyRoadmapSummary("
          + "m.myRoadmapId, m.title, m.createdAt, COUNT(mm)) "
          + "FROM MyRoadmap m LEFT JOIN m.modules mm "
          + "WHERE m.user.id = :userId "
          + "GROUP BY m.myRoadmapId, m.title, m.createdAt "
          + "ORDER BY m.createdAt DESC")
  List<MyRoadmapSummary> findSummariesByUserId(@Param("userId") Long userId);

  // 단건 조회: modules + builderModule JOIN FETCH (N+1 방지)
  @Query(
      "SELECT DISTINCT m FROM MyRoadmap m "
          + "LEFT JOIN FETCH m.modules mm "
          + "LEFT JOIN FETCH mm.builderModule "
          + "WHERE m.myRoadmapId = :id AND m.user.id = :userId")
  Optional<MyRoadmap> findByIdWithModules(@Param("id") Long id, @Param("userId") Long userId);
}
