package com.devpath.domain.roadmap.repository;

import com.devpath.domain.roadmap.entity.NodeRecommendation;
import com.devpath.domain.roadmap.entity.RecommendationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface NodeRecommendationRepository extends JpaRepository<NodeRecommendation, Long> {

    List<NodeRecommendation> findByUser_IdAndRoadmap_RoadmapId(Long userId, Long roadmapId);

    List<NodeRecommendation> findByUser_IdAndRoadmap_RoadmapIdAndStatus(
            Long userId, Long roadmapId, RecommendationStatus status);

    java.util.Optional<NodeRecommendation> findByRecommendationIdAndUser_Id(
            Long recommendationId,
            Long userId
    );

    @Query("SELECT nr FROM NodeRecommendation nr " +
           "WHERE nr.user.id = :userId " +
           "AND nr.roadmap.roadmapId = :roadmapId " +
           "AND nr.status = 'PENDING' " +
           "AND nr.expiresAt < :now")
    List<NodeRecommendation> findExpiredRecommendations(
            @Param("userId") Long userId,
            @Param("roadmapId") Long roadmapId,
            @Param("now") LocalDateTime now
    );
}
