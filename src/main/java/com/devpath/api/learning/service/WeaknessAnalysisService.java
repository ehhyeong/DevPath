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

    // 특정 진단 결과 ID로 취약점 분석 결과를 조회한다.
    @Transactional(readOnly = true)
    public WeaknessAnalysisResponse getAnalysisByResultId(Long userId, Long resultId) {
        DiagnosisResult result = diagnosisResultRepository.findByResultIdAndUser_Id(resultId, userId)
                .orElseThrow(() -> new CustomException(ErrorCode.RESOURCE_NOT_FOUND));

        return WeaknessAnalysisResponse.from(result);
    }

    // 특정 로드맵에 대한 가장 최근 취약점 분석 결과를 조회한다.
    @Transactional(readOnly = true)
    public WeaknessAnalysisResponse getLatestAnalysis(Long userId, Long roadmapId) {
        DiagnosisResult result = diagnosisResultRepository.findLatestByUserAndRoadmap(userId, roadmapId)
                .orElseThrow(() -> new CustomException(ErrorCode.RESOURCE_NOT_FOUND));

        return WeaknessAnalysisResponse.from(result);
    }
}
