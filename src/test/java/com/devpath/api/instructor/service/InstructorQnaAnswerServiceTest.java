package com.devpath.api.instructor.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.devpath.api.instructor.dto.qna.QnaAnswerRequest;
import com.devpath.api.instructor.dto.qna.QnaAnswerResponse;
import com.devpath.domain.instructor.repository.QnaAnswerDraftRepository;
import com.devpath.domain.notification.service.SystemNotificationSender;
import com.devpath.domain.qna.entity.Answer;
import com.devpath.domain.qna.entity.QnaStatus;
import com.devpath.domain.qna.entity.Question;
import com.devpath.domain.qna.entity.QuestionDifficulty;
import com.devpath.domain.qna.entity.QuestionTemplateType;
import com.devpath.domain.qna.repository.AnswerRepository;
import com.devpath.domain.qna.service.QnaAnswerEventPublisher;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.entity.UserRole;
import com.devpath.domain.user.repository.UserProfileRepository;
import com.devpath.domain.user.repository.UserRepository;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class InstructorQnaAnswerServiceTest {

  @Mock private AnswerRepository answerRepository;
  @Mock private UserRepository userRepository;
  @Mock private UserProfileRepository userProfileRepository;
  @Mock private QnaAnswerDraftRepository draftRepository;
  @Mock private InstructorQnaQuestionAccess questionAccess;
  @Mock private QnaAnswerEventPublisher answerEventPublisher;
  @Mock private SystemNotificationSender notificationSender;

  private InstructorQnaAnswerService service;

  @BeforeEach
  void setUp() {
    service =
        new InstructorQnaAnswerService(
            answerRepository,
            userRepository,
            userProfileRepository,
            draftRepository,
            questionAccess,
            answerEventPublisher,
            notificationSender);
  }

  @Test
  void createAnswerDeletesDraftAndPublishesAfterQuestionStateChange() {
    long questionId = 31L;
    long instructorId = 7L;
    User learner = user(3L, "학습자", UserRole.ROLE_LEARNER);
    User instructor = user(instructorId, "강사", UserRole.ROLE_INSTRUCTOR);
    Question question =
        Question.builder()
            .user(learner)
            .templateType(QuestionTemplateType.STUDY)
            .difficulty(QuestionDifficulty.EASY)
            .title("트랜잭션 질문")
            .content("전파 속성이 궁금합니다.")
            .courseId(11L)
            .build();
    ReflectionTestUtils.setField(question, "id", questionId);
    QnaAnswerRequest request = mock(QnaAnswerRequest.class);
    when(request.getContent()).thenReturn("기본 전파 속성은 REQUIRED입니다.");
    when(questionAccess.getManagedQuestion(questionId, instructorId)).thenReturn(question);
    when(answerRepository.findFirstByQuestionIdAndIsDeletedFalse(questionId))
        .thenReturn(Optional.empty());
    when(userRepository.findById(instructorId)).thenReturn(Optional.of(instructor));
    when(answerRepository.save(any(Answer.class)))
        .thenAnswer(
            invocation -> {
              Answer answer = invocation.getArgument(0);
              ReflectionTestUtils.setField(answer, "id", 91L);
              return answer;
            });
    when(draftRepository.findByQuestionIdAndInstructorIdAndIsDeletedFalse(questionId, instructorId))
        .thenReturn(Optional.empty());
    when(userProfileRepository.findByUserId(instructorId)).thenReturn(Optional.empty());

    QnaAnswerResponse response = service.createAnswer(questionId, instructorId, request);

    assertThat(response.getAnswerId()).isEqualTo(91L);
    assertThat(response.getAuthorName()).isEqualTo("강사");
    assertThat(question.getQnaStatus()).isEqualTo(QnaStatus.ANSWERED);
    InOrder publisherOrder = inOrder(answerEventPublisher, notificationSender);
    publisherOrder.verify(answerEventPublisher).answerCreated(question, 91L);
    publisherOrder
        .verify(notificationSender)
        .sendSystemNotification(3L, "QnA 질문에 답변이 등록되었습니다: 트랜잭션 질문");
  }

  private User user(Long id, String name, UserRole role) {
    User user =
        User.builder().email(id + "@test.com").password("encoded").name(name).role(role).build();
    ReflectionTestUtils.setField(user, "id", id);
    return user;
  }
}
