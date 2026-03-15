package com.devpath.api.learner.controller;

import com.devpath.api.learner.dto.DiagnosisQuizDto.*;
import com.devpath.api.learner.service.DiagnosisQuizService;
import com.devpath.common.response.ApiResponse;
import com.devpath.domain.roadmap.entity.DiagnosisQuiz;
import com.devpath.domain.roadmap.entity.DiagnosisResult;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Tag(name = "Diagnosis Quiz", description = "학습자용 진단 퀴즈 API")
@RestController
@RequestMapping("/api/me")
@RequiredArgsConstructor
public class DiagnosisQuizController {

    private final DiagnosisQuizService diagnosisQuizService;

    /**
     * 진단 퀴즈 생성
     */
    @Operation(summary = "진단 퀴즈 생성", description = "로드맵 진입 전 진단 퀴즈를 생성합니다.")
    @PostMapping("/roadmaps/{roadmapId}/diagnosis")
    public ResponseEntity<ApiResponse<QuizResponse>> createDiagnosisQuiz(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long roadmapId,
            @RequestBody CreateQuizRequest request) {

        DiagnosisQuiz quiz = diagnosisQuizService.createDiagnosisQuiz(
                userId,
                roadmapId,
                request.getDifficulty()
        );

        QuizResponse response = QuizResponse.builder()
                .quizId(quiz.getQuizId())
                .roadmapId(quiz.getRoadmap().getRoadmapId())
                .roadmapTitle(quiz.getRoadmap().getTitle())
                .questionCount(quiz.getQuestionCount())
                .difficulty(quiz.getDifficulty())
                .createdAt(quiz.getCreatedAt())
                .build();

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * 진단 퀴즈 답안 제출
     */
    @Operation(summary = "진단 퀴즈 제출", description = "진단 퀴즈 답안을 제출하고 결과를 받습니다.")
    @PostMapping("/diagnosis/{quizId}/submit")
    public ResponseEntity<ApiResponse<QuizResultResponse>> submitQuizAnswer(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long quizId,
            @RequestBody SubmitAnswerRequest request) {

        DiagnosisResult result = diagnosisQuizService.submitQuizAnswer(
                userId,
                quizId,
                request.getAnswers()
        );

        QuizResultResponse response = buildQuizResultResponse(result);

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * 진단 결과 조회
     */
    @Operation(summary = "진단 결과 조회", description = "진단 퀴즈 결과를 조회합니다.")
    @GetMapping("/diagnosis/results/{resultId}")
    public ResponseEntity<ApiResponse<QuizResultDetailResponse>> getDiagnosisResult(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long resultId) {

        DiagnosisResult result = diagnosisQuizService.getDiagnosisResult(userId, resultId);

        QuizResultDetailResponse response = buildQuizResultDetailResponse(result);

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * 최근 진단 결과 조회
     */
    @Operation(summary = "최근 진단 결과 조회", description = "특정 로드맵의 최근 진단 결과를 조회합니다.")
    @GetMapping("/roadmaps/{roadmapId}/diagnosis/latest")
    public ResponseEntity<ApiResponse<QuizResultDetailResponse>> getLatestDiagnosisResult(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long roadmapId) {

        DiagnosisResult result = diagnosisQuizService.getLatestDiagnosisResult(userId, roadmapId);

        QuizResultDetailResponse response = buildQuizResultDetailResponse(result);

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    // ===== Private Helper Methods =====

    private QuizResultResponse buildQuizResultResponse(DiagnosisResult result) {
        return QuizResultResponse.builder()
                .resultId(result.getResultId())
                .quizId(result.getQuiz().getQuizId())
                .score(result.getScore())
                .maxScore(result.getMaxScore())
                .scorePercentage(result.getScorePercentage())
                .weakAreas(parseWeakAreas(result.getWeakAreas()))
                .recommendedNodeIds(parseRecommendedNodes(result.getRecommendedNodes()))
                .createdAt(result.getCreatedAt())
                .build();
    }

    private QuizResultDetailResponse buildQuizResultDetailResponse(DiagnosisResult result) {
        return QuizResultDetailResponse.builder()
                .resultId(result.getResultId())
                .roadmapId(result.getRoadmap().getRoadmapId())
                .roadmapTitle(result.getRoadmap().getTitle())
                .score(result.getScore())
                .maxScore(result.getMaxScore())
                .scorePercentage(result.getScorePercentage())
                .weakAreas(parseWeakAreas(result.getWeakAreas()))
                .recommendedNodes(buildRecommendedNodeInfoList(result.getRecommendedNodes()))
                .createdAt(result.getCreatedAt())
                .build();
    }

    private List<String> parseWeakAreas(String weakAreas) {
        if (weakAreas == null || weakAreas.isEmpty()) {
            return List.of();
        }
        return Arrays.stream(weakAreas.split(","))
                .map(String::trim)
                .collect(Collectors.toList());
    }

    private List<Long> parseRecommendedNodes(String recommendedNodes) {
        if (recommendedNodes == null || recommendedNodes.isEmpty()) {
            return List.of();
        }
        return Arrays.stream(recommendedNodes.split(","))
                .map(String::trim)
                .map(Long::parseLong)
                .collect(Collectors.toList());
    }

    private List<RecommendedNodeInfo> buildRecommendedNodeInfoList(String recommendedNodes) {
        List<Long> nodeIds = parseRecommendedNodes(recommendedNodes);
        // TODO: 실제 노드 정보 조회
        return nodeIds.stream()
                .map(nodeId -> RecommendedNodeInfo.builder()
                        .nodeId(nodeId)
                        .nodeTitle("추천 노드 " + nodeId)
                        .reason("부족한 영역 보강")
                        .build())
                .collect(Collectors.toList());
    }
}
