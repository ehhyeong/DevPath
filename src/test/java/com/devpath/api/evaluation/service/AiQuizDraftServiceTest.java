package com.devpath.api.evaluation.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.devpath.api.evaluation.dto.request.AdoptAiQuizDraftRequest;
import com.devpath.api.evaluation.dto.request.CreateAiQuizDraftRequest;
import com.devpath.api.evaluation.dto.response.AiQuizDraftResponse;
import com.devpath.common.provider.GeminiProvider;
import com.devpath.domain.learning.entity.QuestionType;
import com.devpath.domain.learning.entity.Quiz;
import com.devpath.domain.learning.entity.QuizType;
import com.devpath.domain.learning.repository.QuizRepository;
import com.devpath.domain.roadmap.entity.RoadmapNode;
import com.devpath.domain.roadmap.repository.RoadmapNodeRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.entity.UserRole;
import com.devpath.domain.user.repository.UserRepository;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class AiQuizDraftServiceTest {

  @Mock private UserRepository userRepository;
  @Mock private RoadmapNodeRepository roadmapNodeRepository;
  @Mock private QuizRepository quizRepository;
  @Mock private GeminiProvider geminiProvider;

  private AiQuizDraftService aiQuizDraftService;

  @BeforeEach
  void setUp() {
    aiQuizDraftService =
        new AiQuizDraftService(
            userRepository,
            roadmapNodeRepository,
            quizRepository,
            new AiQuizDraftQuestionGenerator(geminiProvider));
  }

  @Test
  void fallbackDraftCanBeAdoptedAsQuizWithSummedQuestionScore() {
    long instructorId = 7L;
    long nodeId = 31L;
    RoadmapNode node = RoadmapNode.builder().nodeId(nodeId).title("Spring Security").build();
    when(userRepository.findById(instructorId)).thenReturn(Optional.of(instructor()));
    when(roadmapNodeRepository.findById(nodeId)).thenReturn(Optional.of(node));
    when(quizRepository.save(any(Quiz.class)))
        .thenAnswer(
            invocation -> {
              Quiz quiz = invocation.getArgument(0);
              ReflectionTestUtils.setField(quiz, "id", 99L);
              return quiz;
            });
    CreateAiQuizDraftRequest createRequest =
        CreateAiQuizDraftRequest.builder()
            .nodeId(nodeId)
            .title("보안 퀴즈")
            .description("인증과 인가")
            .quizType(QuizType.AI_TOPIC)
            .sourceText("Spring Security는 인증과 인가를 처리합니다.")
            .fallbackOnly(true)
            .questionCount(2)
            .preferredQuestionType(QuestionType.MULTIPLE_CHOICE)
            .difficultyLevel(2)
            .build();

    AiQuizDraftResponse draft = aiQuizDraftService.createDraft(instructorId, createRequest);
    AiQuizDraftResponse adopted =
        aiQuizDraftService.adoptDraft(
            instructorId,
            draft.getDraftId(),
            AdoptAiQuizDraftRequest.builder()
                .publish(true)
                .exposeAnswer(true)
                .exposeExplanation(true)
                .build());

    ArgumentCaptor<Quiz> quizCaptor = ArgumentCaptor.forClass(Quiz.class);
    org.mockito.Mockito.verify(quizRepository).save(quizCaptor.capture());
    assertThat(draft.getStatus()).isEqualTo("DRAFT");
    assertThat(draft.getQuestions()).hasSize(2);
    assertThat(adopted.getStatus()).isEqualTo("ADOPTED");
    assertThat(adopted.getAdoptedQuizId()).isEqualTo(99L);
    assertThat(aiQuizDraftService.getAdoptedDraftCount()).isEqualTo(1);
    assertThat(quizCaptor.getValue().getTotalScore()).isEqualTo(10);
    assertThat(quizCaptor.getValue().getQuestions()).hasSize(2);
  }

  private User instructor() {
    return User.builder()
        .email("instructor@devpath.com")
        .password("encoded")
        .name("강사")
        .role(UserRole.ROLE_INSTRUCTOR)
        .build();
  }
}
