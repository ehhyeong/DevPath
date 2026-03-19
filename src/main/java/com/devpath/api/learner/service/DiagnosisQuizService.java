package com.devpath.api.learner.service;

import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.roadmap.entity.*;
import com.devpath.domain.roadmap.repository.*;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DiagnosisQuizService {

    private final DiagnosisQuizRepository diagnosisQuizRepository;
    private final DiagnosisResultRepository diagnosisResultRepository;
    private final RoadmapRepository roadmapRepository;
    private final UserRepository userRepository;
    private final NodeRequiredTagRepository nodeRequiredTagRepository;

    /**
     * 진단 퀴즈 생성
     */
    @Transactional
    public DiagnosisQuiz createDiagnosisQuiz(Long userId, Long roadmapId, QuizDifficulty difficulty) {
        // 이미 진단 퀴즈를 수행했는지 확인
        if (diagnosisQuizRepository.existsByUser_IdAndRoadmap_RoadmapId(userId, roadmapId)) {
            throw new CustomException(ErrorCode.QUIZ_ALREADY_TAKEN);
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        Roadmap roadmap = roadmapRepository.findById(roadmapId)
                .orElseThrow(() -> new CustomException(ErrorCode.ROADMAP_NOT_FOUND));

        // 난이도에 따른 문항 수 결정
        int questionCount = determineQuestionCount(difficulty);

        DiagnosisQuiz quiz = DiagnosisQuiz.builder()
                .user(user)
                .roadmap(roadmap)
                .questionCount(questionCount)
                .difficulty(difficulty)
                .build();

        return diagnosisQuizRepository.save(quiz);
    }

    /**
     * 진단 퀴즈 제출 및 채점
     */
    @Transactional
    public DiagnosisResult submitQuizAnswer(Long userId, Long quizId, Map<Integer, String> answers) {
        DiagnosisQuiz quiz = diagnosisQuizRepository.findByQuizIdAndUser_Id(quizId, userId)
                .orElseThrow(() -> new CustomException(ErrorCode.QUIZ_NOT_FOUND));

        if (quiz.getSubmittedAt() != null) {
            throw new CustomException(ErrorCode.QUIZ_ALREADY_SUBMITTED);
        }

        // 퀴즈 제출 처리
        quiz.submit();

        // 채점 (임시: 실제로는 정답 데이터와 비교)
        int score = calculateScore(answers);
        int maxScore = quiz.getQuestionCount() * 10;

        // 부족 영역 분석
        String weakAreas = analyzeWeakAreas(quiz.getRoadmap().getRoadmapId(), answers);

        // 추천 노드 생성
        String recommendedNodes = generateRecommendedNodes(weakAreas);

        DiagnosisResult result = DiagnosisResult.builder()
                .user(quiz.getUser())
                .roadmap(quiz.getRoadmap())
                .quiz(quiz)
                .score(score)
                .maxScore(maxScore)
                .weakAreas(weakAreas)
                .recommendedNodes(recommendedNodes)
                .build();

        return diagnosisResultRepository.save(result);
    }

    /**
     * 진단 결과 조회
     */
    public DiagnosisResult getDiagnosisResult(Long userId, Long resultId) {
        return diagnosisResultRepository.findByResultIdAndUser_Id(resultId, userId)
                .orElseThrow(() -> new CustomException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    /**
     * 최근 진단 결과 조회
     */
    public DiagnosisResult getLatestDiagnosisResult(Long userId, Long roadmapId) {
        return diagnosisResultRepository.findLatestByUserAndRoadmap(userId, roadmapId)
                .orElseThrow(() -> new CustomException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    /**
     * 부족 영역 분석
     */
    private String analyzeWeakAreas(Long roadmapId, Map<Integer, String> answers) {
        // TODO: 실제 구현 시 오답 문제와 연관된 태그 분석
        // 임시: 샘플 태그 반환
        List<String> weakTags = Arrays.asList("React Hooks", "State Management", "Component Lifecycle");
        return String.join(",", weakTags);
    }

    /**
     * 추천 노드 생성
     */
    private String generateRecommendedNodes(String weakAreas) {
        // TODO: 실제 구현 시 부족 태그 기반으로 보강 노드 추천
        // 임시: 샘플 노드 ID 반환
        List<Long> nodeIds = Arrays.asList(101L, 102L, 103L);
        return nodeIds.stream()
                .map(String::valueOf)
                .collect(Collectors.joining(","));
    }

    /**
     * 난이도에 따른 문항 수 결정
     */
    private int determineQuestionCount(QuizDifficulty difficulty) {
        return switch (difficulty) {
            case BEGINNER -> 5;
            case INTERMEDIATE -> 7;
            case ADVANCED -> 10;
        };
    }

    /**
     * 채점 (임시)
     */
    private int calculateScore(Map<Integer, String> answers) {
        // TODO: 실제 구현 시 정답 데이터와 비교
        // 임시: 랜덤 점수 반환 (60~100점)
        return 60 + new Random().nextInt(41);
    }
}
