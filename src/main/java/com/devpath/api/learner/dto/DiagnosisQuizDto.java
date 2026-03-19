package com.devpath.api.learner.dto;

import com.devpath.domain.roadmap.entity.DiagnosisQuiz;
import com.devpath.domain.roadmap.entity.DiagnosisResult;
import com.devpath.domain.roadmap.entity.QuizDifficulty;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.Map;

public class DiagnosisQuizDto {

    /**
     * 진단 퀴즈 생성 요청
     */
    @Getter
    @Builder
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

        public static QuizResponse from(DiagnosisQuiz quiz) {
            return QuizResponse.builder()
                    .quizId(quiz.getQuizId())
                    .roadmapId(quiz.getRoadmap().getRoadmapId())
                    .roadmapTitle(quiz.getRoadmap().getTitle())
                    .questionCount(quiz.getQuestionCount())
                    .difficulty(quiz.getDifficulty())
                    .createdAt(quiz.getCreatedAt())
                    .build();
        }
    }

    /**
     * 진단 퀴즈 제출 요청
     */
    @Getter
    @Builder
    public static class SubmitAnswerRequest {
        private Map<Integer, String> answers; // 문제 번호 -> 답변
    }

    /**
     * 진단 결과 응답
     */
    @Getter
    @Builder
    public static class QuizResultResponse {
        private Long resultId;
        private Long quizId;
        private Long roadmapId;
        private String roadmapTitle;
        private Integer score;
        private Integer maxScore;
        private Double scorePercentage;
        private String weakAreas; // 쉼표로 구분된 태그
        private String recommendedNodes; // 쉼표로 구분된 노드 ID
        private LocalDateTime createdAt;

        public static QuizResultResponse from(DiagnosisResult result) {
            return QuizResultResponse.builder()
                    .resultId(result.getResultId())
                    .quizId(result.getQuiz().getQuizId())
                    .roadmapId(result.getRoadmap().getRoadmapId())
                    .roadmapTitle(result.getRoadmap().getTitle())
                    .score(result.getScore())
                    .maxScore(result.getMaxScore())
                    .scorePercentage(result.getScorePercentage())
                    .weakAreas(result.getWeakAreas())
                    .recommendedNodes(result.getRecommendedNodes())
                    .createdAt(result.getCreatedAt())
                    .build();
        }
    }
}
