package com.devpath.api.recommendation.service;

import com.devpath.api.recommendation.dto.DiagnosisQuizDto;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.roadmap.entity.DiagnosisQuiz;
import com.devpath.domain.roadmap.entity.DiagnosisResult;
import com.devpath.domain.roadmap.entity.QuizDifficulty;
import com.devpath.domain.roadmap.entity.Roadmap;
import com.devpath.domain.roadmap.repository.DiagnosisQuizRepository;
import com.devpath.domain.roadmap.repository.DiagnosisResultRepository;
import com.devpath.domain.roadmap.repository.RoadmapRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DiagnosisQuizService {

  private final DiagnosisQuizRepository diagnosisQuizRepository;
  private final DiagnosisResultRepository diagnosisResultRepository;
  private final RoadmapRepository roadmapRepository;
  private final UserRepository userRepository;
  private final DiagnosisRecommendationService diagnosisRecommendationService;

  @Transactional
  public DiagnosisQuizDto.QuizResponse createDiagnosisQuiz(
      Long userId, Long roadmapId, QuizDifficulty difficulty) {
    if (diagnosisQuizRepository.existsByUser_IdAndRoadmap_RoadmapId(userId, roadmapId)) {
      throw new CustomException(ErrorCode.QUIZ_ALREADY_TAKEN);
    }

    User user =
        userRepository
            .findById(userId)
            .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
    Roadmap roadmap =
        roadmapRepository
            .findById(roadmapId)
            .orElseThrow(() -> new CustomException(ErrorCode.ROADMAP_NOT_FOUND));
    DiagnosisQuiz quiz =
        DiagnosisQuiz.builder()
            .user(user)
            .roadmap(roadmap)
            .questionCount(determineQuestionCount(difficulty))
            .difficulty(difficulty)
            .build();
    return DiagnosisQuizDto.QuizResponse.from(diagnosisQuizRepository.save(quiz));
  }

  @Transactional
  public DiagnosisQuizDto.QuizResultResponse submitQuizAnswer(
      Long userId, Long quizId, Long clearedNodeId, Map<Integer, String> answers) {
    DiagnosisQuiz quiz =
        diagnosisQuizRepository
            .findByQuizIdAndUser_Id(quizId, userId)
            .orElseThrow(() -> new CustomException(ErrorCode.QUIZ_NOT_FOUND));
    if (quiz.getSubmittedAt() != null) {
      throw new CustomException(ErrorCode.QUIZ_ALREADY_SUBMITTED);
    }
    quiz.submit();

    DiagnosisRecommendationService.RecommendationResult recommendation =
        diagnosisRecommendationService.recommendForQuiz(
            userId, clearedNodeId, quiz.getRoadmap().getRoadmapId());

    DiagnosisResult result =
        DiagnosisResult.builder()
            .user(quiz.getUser())
            .roadmap(quiz.getRoadmap())
            .quiz(quiz)
            .score(recommendation.score())
            .maxScore(100)
            .weakAreas("")
            .recommendedNodes(recommendation.recommendedNodes())
            .build();
    return DiagnosisQuizDto.QuizResultResponse.from(diagnosisResultRepository.save(result));
  }

  public DiagnosisQuizDto.QuizResultResponse getDiagnosisResult(Long userId, Long resultId) {
    DiagnosisResult result =
        diagnosisResultRepository
            .findByResultIdAndUser_Id(resultId, userId)
            .orElseThrow(() -> new CustomException(ErrorCode.RESOURCE_NOT_FOUND));
    return DiagnosisQuizDto.QuizResultResponse.from(result);
  }

  public DiagnosisQuizDto.QuizResultResponse getLatestDiagnosisResult(Long userId, Long roadmapId) {
    DiagnosisResult result =
        diagnosisResultRepository
            .findLatestByUserAndRoadmap(userId, roadmapId)
            .orElseThrow(() -> new CustomException(ErrorCode.RESOURCE_NOT_FOUND));
    return DiagnosisQuizDto.QuizResultResponse.from(result);
  }

  private int determineQuestionCount(QuizDifficulty difficulty) {
    return switch (difficulty) {
      case BEGINNER -> 5;
      case INTERMEDIATE -> 7;
      case ADVANCED -> 10;
    };
  }
}
