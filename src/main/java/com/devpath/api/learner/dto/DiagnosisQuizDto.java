package com.devpath.api.learner.dto;

import com.devpath.domain.roadmap.entity.QuizDifficulty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public class DiagnosisQuizDto {

    /**
     * 진단 퀴즈 생성 요청
     */
    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateQuizRequest {
        private Long roadmapId;
        private QuizDifficulty difficulty;
    }

    /**
     * 진단 퀴즈 생성 응답
     */
    @Getter
    @Builder
    public static class QuizResponse {
        private Long quizId;
        private Long roadmapId;
        private String roadmapTitle;
        private Integer questionCount;
        private QuizDifficulty difficulty;
        private LocalDateTime createdAt;
    }

    /**
     * 퀴즈 답안 제출 요청
     */
    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SubmitAnswerRequest {
        private Map<Integer, String> answers; // 문항 번호 -> 답안
    }

    /**
     * 진단 결과 응답
     */
    @Getter
    @Builder
    public static class QuizResultResponse {
        private Long resultId;
        private Long quizId;
        private Integer score;
        private Integer maxScore;
        private Double scorePercentage;
        private List<String> weakAreas;
        private List<Long> recommendedNodeIds;
        private LocalDateTime createdAt;
    }

    /**
     * 진단 결과 상세 응답
     */
    @Getter
    @Builder
    public static class QuizResultDetailResponse {
        private Long resultId;
        private Long roadmapId;
        private String roadmapTitle;
        private Integer score;
        private Integer maxScore;
        private Double scorePercentage;
        private List<String> weakAreas;
        private List<RecommendedNodeInfo> recommendedNodes;
        private LocalDateTime createdAt;
    }

    /**
     * 추천 노드 정보
     */
    @Getter
    @Builder
    public static class RecommendedNodeInfo {
        private Long nodeId;
        private String nodeTitle;
        private String reason;
    }
}
