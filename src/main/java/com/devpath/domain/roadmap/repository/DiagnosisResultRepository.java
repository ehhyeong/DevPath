package com.devpath.domain.roadmap.repository;

import com.devpath.domain.roadmap.entity.DiagnosisResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface DiagnosisResultRepository extends JpaRepository<DiagnosisResult, Long> {

    /**
     * 특정 사용자가 특정 로드맵에 대한 진단 결과 조회
     */
    @Query("SELECT dr FROM DiagnosisResult dr " +
            "WHERE dr.user.userId = :userId AND dr.roadmap.roadmapId = :roadmapId " +
            "ORDER BY dr.createdAt DESC LIMIT 1")
    Optional<DiagnosisResult> findLatestByUserAndRoadmap(@Param("userId") Long userId,
                                                           @Param("roadmapId") Long roadmapId);

    /**
     * 퀴즈 ID로 진단 결과 조회
     */
    Optional<DiagnosisResult> findByQuiz_QuizId(Long quizId);

    /**
     * 결과 ID와 사용자 ID로 진단 결과 조회
     */
    Optional<DiagnosisResult> findByResultIdAndUser_UserId(Long resultId, Long userId);
}
