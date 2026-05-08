package com.devpath.api.learning.service;

import com.devpath.api.learning.dto.WeaknessAnalysisResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.roadmap.entity.DiagnosisResult;
import com.devpath.domain.roadmap.repository.DiagnosisResultRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class WeaknessAnalysisService {

  private final DiagnosisResultRepository diagnosisResultRepository;

  @Transactional(readOnly = true)
  public WeaknessAnalysisResponse getAnalysisByResultId(Long userId, Long resultId) {
    DiagnosisResult result =
        diagnosisResultRepository
            .findByResultIdAndUser_Id(resultId, userId)
            .orElseThrow(() -> new CustomException(ErrorCode.RESOURCE_NOT_FOUND));

    return WeaknessAnalysisResponse.from(result);
  }

  @Transactional(readOnly = true)
  public WeaknessAnalysisResponse getLatestAnalysis(Long userId, Long roadmapId) {
    DiagnosisResult result =
        diagnosisResultRepository
            .findLatestByUserAndRoadmap(userId, roadmapId)
            .orElseThrow(() -> new CustomException(ErrorCode.RESOURCE_NOT_FOUND));

    return WeaknessAnalysisResponse.from(result);
  }

  @Transactional(readOnly = true)
  public WeaknessAnalysisResponse getLatestAnalysisForHistory(Long userId) {
    return diagnosisResultRepository
        .findTopByUser_IdOrderByCreatedAtDesc(userId)
        .map(WeaknessAnalysisResponse::from)
        .orElse(null);
  }

  @Transactional(readOnly = true)
  public boolean hasLatestAnalysisSignalForRecommendationChange(Long userId) {
    return getLatestAnalysisForHistory(userId) != null;
  }
}
