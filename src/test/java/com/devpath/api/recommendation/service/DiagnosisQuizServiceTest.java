package com.devpath.api.recommendation.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.devpath.api.recommendation.dto.DiagnosisQuizDto;
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
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class DiagnosisQuizServiceTest {

  @Mock private DiagnosisQuizRepository diagnosisQuizRepository;
  @Mock private DiagnosisResultRepository diagnosisResultRepository;
  @Mock private RoadmapRepository roadmapRepository;
  @Mock private UserRepository userRepository;
  @Mock private DiagnosisRecommendationService diagnosisRecommendationService;

  private DiagnosisQuizService diagnosisQuizService;

  @BeforeEach
  void setUp() {
    diagnosisQuizService =
        new DiagnosisQuizService(
            diagnosisQuizRepository,
            diagnosisResultRepository,
            roadmapRepository,
            userRepository,
            diagnosisRecommendationService);
  }

  @Test
  void createDiagnosisQuizUsesQuestionCountForRequestedDifficulty() {
    long userId = 7L;
    long roadmapId = 12L;
    User user = user(userId);
    Roadmap roadmap = roadmap(roadmapId);
    when(diagnosisQuizRepository.existsByUser_IdAndRoadmap_RoadmapId(userId, roadmapId))
        .thenReturn(false);
    when(userRepository.findById(userId)).thenReturn(Optional.of(user));
    when(roadmapRepository.findById(roadmapId)).thenReturn(Optional.of(roadmap));
    when(diagnosisQuizRepository.save(any(DiagnosisQuiz.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));

    DiagnosisQuizDto.QuizResponse response =
        diagnosisQuizService.createDiagnosisQuiz(userId, roadmapId, QuizDifficulty.ADVANCED);

    assertThat(response.getRoadmapId()).isEqualTo(roadmapId);
    assertThat(response.getQuestionCount()).isEqualTo(10);
    assertThat(response.getDifficulty()).isEqualTo(QuizDifficulty.ADVANCED);
  }

  @Test
  void submitQuizAnswerPersistsCourseScoreWithoutRecommendationWhenNodeIsMissing() {
    long userId = 7L;
    long quizId = 31L;
    User user = user(userId);
    Roadmap roadmap = roadmap(12L);
    DiagnosisQuiz quiz =
        DiagnosisQuiz.builder()
            .user(user)
            .roadmap(roadmap)
            .questionCount(7)
            .difficulty(QuizDifficulty.INTERMEDIATE)
            .build();
    ReflectionTestUtils.setField(quiz, "quizId", quizId);
    when(diagnosisQuizRepository.findByQuizIdAndUser_Id(quizId, userId))
        .thenReturn(Optional.of(quiz));
    when(diagnosisRecommendationService.recommendForQuiz(userId, null, 12L))
        .thenReturn(new DiagnosisRecommendationService.RecommendationResult(83, ""));
    when(diagnosisResultRepository.save(any(DiagnosisResult.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));

    DiagnosisQuizDto.QuizResultResponse response =
        diagnosisQuizService.submitQuizAnswer(userId, quizId, null, Map.of());

    ArgumentCaptor<DiagnosisResult> resultCaptor = ArgumentCaptor.forClass(DiagnosisResult.class);
    org.mockito.Mockito.verify(diagnosisResultRepository).save(resultCaptor.capture());
    assertThat(quiz.getSubmittedAt()).isNotNull();
    assertThat(resultCaptor.getValue().getScore()).isEqualTo(83);
    assertThat(resultCaptor.getValue().getRecommendedNodes()).isEmpty();
    assertThat(response.getScore()).isEqualTo(83);
    assertThat(response.getRecommendedNodes()).isEmpty();
  }

  private User user(long userId) {
    User user = User.builder().email("learner@devpath.com").password("encoded").name("학습자").build();
    ReflectionTestUtils.setField(user, "id", userId);
    return user;
  }

  private Roadmap roadmap(long roadmapId) {
    return Roadmap.builder().roadmapId(roadmapId).title("백엔드 로드맵").build();
  }
}
