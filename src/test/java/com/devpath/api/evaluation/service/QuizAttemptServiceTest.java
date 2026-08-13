package com.devpath.api.evaluation.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.devpath.api.evaluation.dto.request.SubmitQuizAnswerRequest;
import com.devpath.api.evaluation.dto.request.SubmitQuizAttemptRequest;
import com.devpath.api.evaluation.dto.response.QuizAttemptResultResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.course.entity.EnrollmentStatus;
import com.devpath.domain.course.repository.CourseEnrollmentRepository;
import com.devpath.domain.course.repository.CourseNodeMappingRepository;
import com.devpath.domain.learning.entity.QuestionType;
import com.devpath.domain.learning.entity.Quiz;
import com.devpath.domain.learning.entity.QuizAttempt;
import com.devpath.domain.learning.entity.QuizQuestion;
import com.devpath.domain.learning.entity.QuizQuestionOption;
import com.devpath.domain.learning.entity.QuizType;
import com.devpath.domain.learning.repository.QuizAnswerRepository;
import com.devpath.domain.learning.repository.QuizAttemptRepository;
import com.devpath.domain.learning.repository.QuizQuestionOptionRepository;
import com.devpath.domain.learning.repository.QuizQuestionRepository;
import com.devpath.domain.learning.repository.QuizRepository;
import com.devpath.domain.roadmap.entity.RoadmapNode;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.entity.UserRole;
import com.devpath.domain.user.repository.UserRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class QuizAttemptServiceTest {

  @Mock private UserRepository userRepository;
  @Mock private QuizRepository quizRepository;
  @Mock private QuizQuestionRepository quizQuestionRepository;
  @Mock private QuizQuestionOptionRepository quizQuestionOptionRepository;
  @Mock private QuizAttemptRepository quizAttemptRepository;
  @Mock private QuizAnswerRepository quizAnswerRepository;
  @Mock private QuizResultQueryService quizResultQueryService;
  @Mock private CourseNodeMappingRepository courseNodeMappingRepository;
  @Mock private CourseEnrollmentRepository courseEnrollmentRepository;

  private QuizAttemptService service;

  @BeforeEach
  void setUp() {
    service =
        new QuizAttemptService(
            userRepository,
            quizRepository,
            quizQuestionRepository,
            quizQuestionOptionRepository,
            quizAttemptRepository,
            quizAnswerRepository,
            quizResultQueryService,
            courseNodeMappingRepository,
            courseEnrollmentRepository);
  }

  @Test
  void rejectsAttemptWhenLearnerIsNotEnrolledInMappedCourse() {
    User learner = learner(7L);
    Quiz quiz = quiz(10L, 60);
    when(userRepository.findById(7L)).thenReturn(Optional.of(learner));
    when(quizRepository.findByIdAndIsDeletedFalse(10L)).thenReturn(Optional.of(quiz));
    when(courseNodeMappingRepository.findCourseIdsByNodeId(20L)).thenReturn(List.of(30L));
    when(courseEnrollmentRepository.existsByUser_IdAndCourse_CourseIdInAndStatusIn(
            7L, List.of(30L), List.of(EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED)))
        .thenReturn(false);

    assertThatThrownBy(() -> service.submitQuizAttempt(7L, 10L, request(101L, 1001L)))
        .isInstanceOf(CustomException.class)
        .extracting("errorCode")
        .isEqualTo(ErrorCode.FORBIDDEN);
    verify(quizAttemptRepository, never()).save(any());
  }

  @Test
  void gradesWithConfiguredPercentageInsteadOfHardcodedPerfectScore() {
    User learner = learner(7L);
    Quiz quiz = quiz(10L, 70);
    QuizQuestion question = question(quiz, 101L, 6);
    QuizQuestion otherQuestion = question(quiz, 102L, 4);
    QuizQuestionOption correctOption = option(question, 1001L, true);
    QuizQuestionOption wrongOption = option(otherQuestion, 1002L, false);
    QuizAttemptResultResponse response = QuizAttemptResultResponse.builder().attemptId(50L).build();

    when(userRepository.findById(7L)).thenReturn(Optional.of(learner));
    when(quizRepository.findByIdAndIsDeletedFalse(10L)).thenReturn(Optional.of(quiz));
    when(courseNodeMappingRepository.findCourseIdsByNodeId(20L)).thenReturn(List.of(30L));
    when(courseEnrollmentRepository.existsByUser_IdAndCourse_CourseIdInAndStatusIn(
            7L, List.of(30L), List.of(EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED)))
        .thenReturn(true);
    when(quizQuestionRepository.findAllByQuizIdAndIsDeletedFalseOrderByDisplayOrderAsc(10L))
        .thenReturn(List.of(question, otherQuestion));
    when(quizAttemptRepository.findTopByQuizIdAndLearnerIdAndIsDeletedFalseOrderByAttemptNumberDesc(
            10L, 7L))
        .thenReturn(Optional.empty());
    when(quizAttemptRepository.save(any(QuizAttempt.class)))
        .thenAnswer(
            invocation -> {
              QuizAttempt attempt = invocation.getArgument(0);
              ReflectionTestUtils.setField(attempt, "id", 50L);
              return attempt;
            });
    when(quizQuestionOptionRepository.findAllByQuestionIdAndIsDeletedFalseOrderByDisplayOrderAsc(
            101L))
        .thenReturn(List.of(correctOption));
    when(quizQuestionOptionRepository.findAllByQuestionIdAndIsDeletedFalseOrderByDisplayOrderAsc(
            102L))
        .thenReturn(List.of(wrongOption));
    when(quizResultQueryService.getQuizAttemptResult(7L, 50L)).thenReturn(response);

    service.submitQuizAttempt(
        7L,
        10L,
        SubmitQuizAttemptRequest.builder()
            .answers(
                List.of(
                    SubmitQuizAnswerRequest.builder()
                        .questionId(101L)
                        .selectedOptionId(1001L)
                        .build(),
                    SubmitQuizAnswerRequest.builder()
                        .questionId(102L)
                        .selectedOptionId(1002L)
                        .build()))
            .timeSpentSeconds(30)
            .build());

    ArgumentCaptor<QuizAttempt> attemptCaptor = ArgumentCaptor.forClass(QuizAttempt.class);
    verify(quizAttemptRepository).save(attemptCaptor.capture());
    assertThat(attemptCaptor.getValue().getScore()).isEqualTo(6);
    assertThat(attemptCaptor.getValue().getMaxScore()).isEqualTo(10);
    assertThat(attemptCaptor.getValue().getIsPassed()).isFalse();
  }

  private SubmitQuizAttemptRequest request(Long questionId, Long optionId) {
    return SubmitQuizAttemptRequest.builder()
        .answers(
            List.of(
                SubmitQuizAnswerRequest.builder()
                    .questionId(questionId)
                    .selectedOptionId(optionId)
                    .build()))
        .timeSpentSeconds(10)
        .build();
  }

  private User learner(Long id) {
    User user =
        User.builder()
            .email("learner@example.com")
            .password("password")
            .name("학습자")
            .role(UserRole.ROLE_LEARNER)
            .build();
    ReflectionTestUtils.setField(user, "id", id);
    return user;
  }

  private Quiz quiz(Long id, int passScore) {
    RoadmapNode node = RoadmapNode.builder().nodeId(20L).title("노드").build();
    Quiz quiz =
        Quiz.builder()
            .roadmapNode(node)
            .title("퀴즈")
            .quizType(QuizType.MANUAL)
            .totalScore(10)
            .passScore(passScore)
            .isPublished(true)
            .isActive(true)
            .build();
    ReflectionTestUtils.setField(quiz, "id", id);
    return quiz;
  }

  private QuizQuestion question(Quiz quiz, Long id, int points) {
    QuizQuestion question =
        QuizQuestion.builder()
            .quiz(quiz)
            .questionType(QuestionType.MULTIPLE_CHOICE)
            .questionText("문항 " + id)
            .points(points)
            .displayOrder(id.intValue())
            .build();
    ReflectionTestUtils.setField(question, "id", id);
    return question;
  }

  private QuizQuestionOption option(QuizQuestion question, Long id, boolean correct) {
    QuizQuestionOption option =
        QuizQuestionOption.builder()
            .question(question)
            .optionText("선택지 " + id)
            .isCorrect(correct)
            .displayOrder(0)
            .build();
    ReflectionTestUtils.setField(option, "id", id);
    return option;
  }
}
