package com.devpath.api.qna.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.devpath.api.qna.dto.AnswerCreateRequest;
import com.devpath.api.qna.dto.AnswerResponse;
import com.devpath.api.qna.dto.QuestionCreateRequest;
import com.devpath.api.qna.dto.QuestionDetailResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.qna.entity.Answer;
import com.devpath.domain.qna.entity.Question;
import com.devpath.domain.qna.entity.QuestionDifficulty;
import com.devpath.domain.qna.entity.QuestionTemplate;
import com.devpath.domain.qna.entity.QuestionTemplateType;
import com.devpath.domain.qna.repository.AnswerRepository;
import com.devpath.domain.qna.repository.QuestionRepository;
import com.devpath.domain.qna.repository.QuestionTemplateRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.entity.UserRole;
import com.devpath.domain.user.repository.UserRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;
import org.springframework.test.util.ReflectionTestUtils;

@DataJpaTest(
    properties = {
      "spring.jpa.hibernate.ddl-auto=create-drop",
      "spring.sql.init.mode=never",
      "spring.jpa.defer-datasource-initialization=false"
    })
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.ANY)
@Import(QnaService.class)
class QnaServiceIntegrationTest {

  @Autowired private QnaService qnaService;

  @Autowired private UserRepository userRepository;

  @Autowired private QuestionRepository questionRepository;

  @Autowired private AnswerRepository answerRepository;

  @Autowired private QuestionTemplateRepository questionTemplateRepository;

  @Autowired private EntityManager entityManager;

  @Test
  @DisplayName("질문 등록에 성공한다")
  void createQuestionSuccess() {
    User author = saveUser("qna-author@devpath.com");
    saveActiveTemplate(QuestionTemplateType.DEBUGGING, 1);

    QuestionCreateRequest request =
        questionCreateRequest(
            QuestionTemplateType.DEBUGGING,
            QuestionDifficulty.MEDIUM,
            "Spring Boot에서 JWT 필터가 두 번 실행됩니다.",
            "OncePerRequestFilter인데 로그가 두 번 찍힙니다.");

    QuestionDetailResponse response = qnaService.createQuestion(author.getId(), request);
    flushAndClear();

    Question savedQuestion = questionRepository.findById(response.getId()).orElseThrow();

    assertThat(response.getAuthorId()).isEqualTo(author.getId());
    assertThat(response.getTemplateType()).isEqualTo(QuestionTemplateType.DEBUGGING.name());
    assertThat(response.getDifficulty()).isEqualTo(QuestionDifficulty.MEDIUM.name());
    assertThat(response.getAnswers()).isEmpty();
    assertThat(savedQuestion.getTitle()).isEqualTo(request.getTitle());
    assertThat(savedQuestion.getContent()).isEqualTo(request.getContent());
    assertThat(savedQuestion.getTemplateType()).isEqualTo(QuestionTemplateType.DEBUGGING);
    assertThat(savedQuestion.getDifficulty()).isEqualTo(QuestionDifficulty.MEDIUM);
    assertThat(savedQuestion.getAdoptedAnswerId()).isNull();
    assertThat(savedQuestion.getViewCount()).isZero();
  }

  @Test
  @DisplayName("질문 상세 조회 시 조회수가 증가한다")
  void getQuestionDetailIncrementsViewCount() {
    User author = saveUser("qna-view@devpath.com");
    Question question =
        saveQuestion(
            author,
            QuestionTemplateType.DEBUGGING,
            QuestionDifficulty.EASY,
            "조회수 증가 테스트",
            "상세 조회를 두 번 호출합니다.");
    flushAndClear();

    QuestionDetailResponse firstResponse =
        qnaService.getQuestionDetail(author.getId(), question.getId());
    flushAndClear();

    QuestionDetailResponse secondResponse =
        qnaService.getQuestionDetail(author.getId(), question.getId());
    flushAndClear();

    assertThat(firstResponse.getViewCount()).isEqualTo(1);
    assertThat(secondResponse.getViewCount()).isEqualTo(2);
    assertThat(questionRepository.findById(question.getId()))
        .get()
        .extracting(Question::getViewCount)
        .isEqualTo(2);
  }

  @Test
  @DisplayName("답변 등록과 채택에 성공한다")
  void createAnswerAndAdoptSuccess() {
    User author = saveUser("qna-owner@devpath.com");
    User answerAuthor = saveUser("qna-answer@devpath.com");
    saveActiveTemplate(QuestionTemplateType.DEBUGGING, 1);

    QuestionDetailResponse question =
        qnaService.createQuestion(
            author.getId(),
            questionCreateRequest(
                QuestionTemplateType.DEBUGGING,
                QuestionDifficulty.MEDIUM,
                "JWT 필터 중복 실행 원인이 뭘까요",
                "필터 체인 설정을 먼저 봐야 할까요?"));

    AnswerResponse answer =
        qnaService.createAnswer(
            answerAuthor.getId(),
            question.getId(),
            answerCreateRequest("SecurityFilterChain 설정과 필터 등록 위치를 점검해보세요."));
    flushAndClear();

    QuestionDetailResponse adopted =
        qnaService.adoptAnswer(author.getId(), question.getId(), answer.getId());
    flushAndClear();

    Question savedQuestion = questionRepository.findById(question.getId()).orElseThrow();
    Answer savedAnswer = answerRepository.findById(answer.getId()).orElseThrow();

    assertThat(savedQuestion.getAdoptedAnswerId()).isEqualTo(answer.getId());
    assertThat(savedAnswer.isAdopted()).isTrue();
    assertThat(adopted.getAdoptedAnswerId()).isEqualTo(answer.getId());
    assertThat(adopted.getAnswers()).hasSize(1);
    assertThat(adopted.getAnswers().get(0).getId()).isEqualTo(answer.getId());
    assertThat(adopted.getAnswers().get(0).isAdopted()).isTrue();
  }

  @Test
  @DisplayName("질문 작성자가 아니면 답변을 채택할 수 없다")
  void adoptAnswerFailsWhenNotOwner() {
    User owner = saveUser("qna-real-owner@devpath.com");
    User answerAuthor = saveUser("qna-other-answer@devpath.com");
    User intruder = saveUser("qna-intruder@devpath.com");
    saveActiveTemplate(QuestionTemplateType.DEBUGGING, 1);

    QuestionDetailResponse question =
        qnaService.createQuestion(
            owner.getId(),
            questionCreateRequest(
                QuestionTemplateType.DEBUGGING,
                QuestionDifficulty.MEDIUM,
                "채택 권한 테스트",
                "질문 작성자만 채택할 수 있어야 합니다."));
    AnswerResponse answer =
        qnaService.createAnswer(
            answerAuthor.getId(), question.getId(), answerCreateRequest("제가 쓴 답변입니다."));

    assertThatThrownBy(
            () -> qnaService.adoptAnswer(intruder.getId(), question.getId(), answer.getId()))
        .isInstanceOf(CustomException.class)
        .extracting(throwable -> ((CustomException) throwable).getErrorCode())
        .isEqualTo(ErrorCode.UNAUTHORIZED_ACTION);
  }

  @Test
  @DisplayName("이미 채택된 질문은 재채택할 수 없다")
  void adoptAnswerFailsWhenAlreadyAdopted() {
    User owner = saveUser("qna-adopt-owner@devpath.com");
    User firstAnswerAuthor = saveUser("qna-first-answer@devpath.com");
    User secondAnswerAuthor = saveUser("qna-second-answer@devpath.com");
    saveActiveTemplate(QuestionTemplateType.DEBUGGING, 1);

    QuestionDetailResponse question =
        qnaService.createQuestion(
            owner.getId(),
            questionCreateRequest(
                QuestionTemplateType.DEBUGGING,
                QuestionDifficulty.HARD,
                "재채택 방지 테스트",
                "이미 채택된 질문은 다시 채택되면 안 됩니다."));
    AnswerResponse firstAnswer =
        qnaService.createAnswer(
            firstAnswerAuthor.getId(), question.getId(), answerCreateRequest("첫 번째 답변"));
    AnswerResponse secondAnswer =
        qnaService.createAnswer(
            secondAnswerAuthor.getId(), question.getId(), answerCreateRequest("두 번째 답변"));

    qnaService.adoptAnswer(owner.getId(), question.getId(), firstAnswer.getId());

    assertThatThrownBy(
            () -> qnaService.adoptAnswer(owner.getId(), question.getId(), secondAnswer.getId()))
        .isInstanceOf(CustomException.class)
        .extracting(throwable -> ((CustomException) throwable).getErrorCode())
        .isEqualTo(ErrorCode.ALREADY_ADOPTED);
  }

  private User saveUser(String email) {
    return userRepository.save(
        User.builder()
            .email(email)
            .password("encoded-password")
            .name(email)
            .role(UserRole.ROLE_LEARNER)
            .build());
  }

  private QuestionTemplate saveActiveTemplate(QuestionTemplateType templateType, int sortOrder) {
    return questionTemplateRepository.save(
        QuestionTemplate.builder()
            .templateType(templateType)
            .name(templateType.name() + " template")
            .description(templateType.name() + " description")
            .guideExample(templateType.name() + " guide")
            .sortOrder(sortOrder)
            .isActive(true)
            .build());
  }

  private Question saveQuestion(
      User user,
      QuestionTemplateType templateType,
      QuestionDifficulty difficulty,
      String title,
      String content) {
    return questionRepository.save(
        Question.builder()
            .user(user)
            .templateType(templateType)
            .difficulty(difficulty)
            .title(title)
            .content(content)
            .build());
  }

  private QuestionCreateRequest questionCreateRequest(
      QuestionTemplateType templateType,
      QuestionDifficulty difficulty,
      String title,
      String content) {
    QuestionCreateRequest request = newInstance(QuestionCreateRequest.class);
    ReflectionTestUtils.setField(request, "templateType", templateType);
    ReflectionTestUtils.setField(request, "difficulty", difficulty);
    ReflectionTestUtils.setField(request, "title", title);
    ReflectionTestUtils.setField(request, "content", content);
    return request;
  }

  private AnswerCreateRequest answerCreateRequest(String content) {
    AnswerCreateRequest request = newInstance(AnswerCreateRequest.class);
    ReflectionTestUtils.setField(request, "content", content);
    return request;
  }

  private void flushAndClear() {
    entityManager.flush();
    entityManager.clear();
  }

  private <T> T newInstance(Class<T> type) {
    try {
      var constructor = type.getDeclaredConstructor();
      constructor.setAccessible(true);
      return constructor.newInstance();
    } catch (ReflectiveOperationException e) {
      throw new IllegalStateException(
          "Failed to create test request instance: " + type.getName(), e);
    }
  }
}
