package com.devpath.domain.roadmap.repository;

import com.devpath.domain.roadmap.entity.DiagnosisQuiz;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface DiagnosisQuizRepository extends JpaRepository<DiagnosisQuiz, Long> {

    /**
     * 특정 사용자가 특정 로드맵에 대해 진단 퀴즈를 이미 수행했는지 확인
     */
    boolean existsByUser_IdAndRoadmap_RoadmapId(Long userId, Long roadmapId);

    /**
     * 특정 사용자가 특정 로드맵에 대해 수행한 가장 최근 진단 퀴즈 조회
     */
    @Query("SELECT dq FROM DiagnosisQuiz dq " +
            "WHERE dq.user.id = :userId AND dq.roadmap.roadmapId = :roadmapId " +
            "ORDER BY dq.createdAt DESC LIMIT 1")
    Optional<DiagnosisQuiz> findLatestByUserAndRoadmap(@Param("userId") Long userId,
                                                         @Param("roadmapId") Long roadmapId);

    /**
     * 퀴즈 ID와 사용자 ID로 진단 퀴즈 조회
     */
    Optional<DiagnosisQuiz> findByQuizIdAndUser_Id(Long quizId, Long userId);
}
