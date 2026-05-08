package com.devpath.domain.roadmap.repository;

import com.devpath.domain.roadmap.entity.DiagnosisResult;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DiagnosisResultRepository extends JpaRepository<DiagnosisResult, Long> {

  Optional<DiagnosisResult> findTopByUser_IdAndRoadmap_RoadmapIdOrderByCreatedAtDesc(
      Long userId, Long roadmapId);

  Optional<DiagnosisResult> findTopByUser_IdOrderByCreatedAtDesc(Long userId);

  Optional<DiagnosisResult> findByQuiz_QuizId(Long quizId);

  Optional<DiagnosisResult> findByResultIdAndUser_Id(Long resultId, Long userId);

  default Optional<DiagnosisResult> findLatestByUserAndRoadmap(Long userId, Long roadmapId) {
    return findTopByUser_IdAndRoadmap_RoadmapIdOrderByCreatedAtDesc(userId, roadmapId);
  }
}
