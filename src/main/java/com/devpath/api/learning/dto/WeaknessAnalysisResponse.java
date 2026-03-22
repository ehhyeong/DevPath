package com.devpath.api.learning.dto;

import com.devpath.domain.roadmap.entity.DiagnosisResult;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class WeaknessAnalysisResponse {

    private Long resultId;
    private Long roadmapId;
    private Integer score;
    private Integer maxScore;
    private Double scorePercentage;

    // 취약 태그 목록 (weakAreas 콤마 구분 문자열을 파싱)
    private List<String> weakTags;

    // 추천 노드 ID 목록 (recommendedNodes 콤마 구분 문자열을 파싱)
    private List<Long> recommendedNodeIds;

    private LocalDateTime analyzedAt;

    public static WeaknessAnalysisResponse from(DiagnosisResult result) {
        List<String> weakTags = parseWeakTags(result.getWeakAreas());
        List<Long> recommendedNodeIds = parseNodeIds(result.getRecommendedNodes());

        return WeaknessAnalysisResponse.builder()
                .resultId(result.getResultId())
                .roadmapId(result.getRoadmap().getRoadmapId())
                .score(result.getScore())
                .maxScore(result.getMaxScore())
                .scorePercentage(result.getScorePercentage())
                .weakTags(weakTags)
                .recommendedNodeIds(recommendedNodeIds)
                .analyzedAt(result.getCreatedAt())
                .build();
    }

    // 콤마 구분 취약 태그 문자열을 리스트로 파싱한다.
    private static List<String> parseWeakTags(String weakAreas) {
        if (weakAreas == null || weakAreas.isBlank()) {
            return Collections.emptyList();
        }
        return Arrays.stream(weakAreas.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toList());
    }

    // 콤마 구분 노드 ID 문자열을 Long 리스트로 파싱한다.
    private static List<Long> parseNodeIds(String recommendedNodes) {
        if (recommendedNodes == null || recommendedNodes.isBlank()) {
            return Collections.emptyList();
        }
        return Arrays.stream(recommendedNodes.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(Long::parseLong)
                .collect(Collectors.toList());
    }
}
