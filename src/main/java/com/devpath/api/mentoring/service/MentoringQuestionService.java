package com.devpath.api.mentoring.service;

import com.devpath.api.notification.service.NotificationEventService;
import com.devpath.api.qna.dto.AnswerCreateRequest;
import com.devpath.api.qna.dto.AnswerResponse;
import com.devpath.api.qna.dto.QuestionCreateRequest;
import com.devpath.api.qna.dto.QuestionDetailResponse;
import com.devpath.api.qna.dto.QuestionStatusUpdateRequest;
import com.devpath.api.qna.dto.QuestionSummaryResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.mentoring.entity.Mentoring;
import com.devpath.domain.mentoring.repository.MentoringRepository;
import com.devpath.domain.qna.entity.Answer;
import com.devpath.domain.qna.entity.QnaStatus;
import com.devpath.domain.qna.entity.Question;
import com.devpath.domain.qna.entity.QuestionScope;
import com.devpath.domain.qna.repository.AnswerRepository;
import com.devpath.domain.qna.repository.QuestionRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MentoringQuestionService {

  private final MentoringRepository mentoringRepository;
  private final QuestionRepository questionRepository;
  private final AnswerRepository answerRepository;
  private final UserRepository userRepository;
  private final NotificationEventService notificationEventService;

  @Transactional
  public QuestionDetailResponse createQuestion(
      Long userId, Long mentoringId, QuestionCreateRequest request) {
    User user = getUser(userId);
    Mentoring mentoring = getActiveMentoring(mentoringId);

    validateMentoringMember(mentoring, user.getId());

    Question question =
        Question.builder()
            .user(user)
            .templateType(request.getTemplateType())
            .difficulty(request.getDifficulty())
            .title(request.getTitle())
            .content(request.getContent())
            .build();

    question.attachMentoring(mentoring.getId());

    Question savedQuestion = questionRepository.save(question);

    return QuestionDetailResponse.from(savedQuestion, List.of());
  }

  public List<QuestionSummaryResponse> getQuestions(Long userId, Long mentoringId) {
    User user = getUser(userId);
    Mentoring mentoring = getActiveMentoring(mentoringId);

    validateMentoringMember(mentoring, user.getId());

    return questionRepository
        .findAllByQuestionScopeAndMentoringIdAndIsDeletedFalseOrderByCreatedAtDesc(
            QuestionScope.MENTORING, mentoringId)
        .stream()
        .map(QuestionSummaryResponse::from)
        .toList();
  }

  @Transactional
  public QuestionDetailResponse getQuestion(Long userId, Long questionId) {
    User user = getUser(userId);
    Question question = getActiveMentoringQuestion(questionId);
    Mentoring mentoring = getActiveMentoring(question.getMentoringId());

    validateMentoringMember(mentoring, user.getId());

    question.incrementViewCount();

    return QuestionDetailResponse.from(question, getAnswerResponses(question.getId()));
  }

  @Transactional
  public AnswerResponse createAnswer(Long userId, Long questionId, AnswerCreateRequest request) {
    User user = getUser(userId);
    Question question = getActiveMentoringQuestion(questionId);
    Mentoring mentoring = getActiveMentoring(question.getMentoringId());

    validateMentoringMember(mentoring, user.getId());
    validateAnswerable(question);

    Answer answer =
        Answer.builder().question(question).user(user).content(request.getContent()).build();

    Answer savedAnswer = answerRepository.save(answer);

    question.markAsAnswered();
    sendAnswerNotification(question, user);

    return AnswerResponse.from(savedAnswer);
  }

  @Transactional
  public QuestionDetailResponse updateStatus(
      Long userId, Long questionId, QuestionStatusUpdateRequest request) {
    User user = getUser(userId);
    Question question = getActiveMentoringQuestion(questionId);
    Mentoring mentoring = getActiveMentoring(question.getMentoringId());

    validateMentoringMember(mentoring, user.getId());
    validateQuestionStatus(request.getStatus());

    question.updateQnaStatus(request.getStatus());

    return QuestionDetailResponse.from(question, getAnswerResponses(question.getId()));
  }

  private User getUser(Long userId) {
    return userRepository
        .findById(userId)
        .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
  }

  private Mentoring getActiveMentoring(Long mentoringId) {
    return mentoringRepository
        .findByIdAndIsDeletedFalse(mentoringId)
        .orElseThrow(() -> new CustomException(ErrorCode.MENTORING_NOT_FOUND));
  }

  private Question getActiveMentoringQuestion(Long questionId) {
    return questionRepository
        .findByIdAndQuestionScopeAndIsDeletedFalse(questionId, QuestionScope.MENTORING)
        .orElseThrow(() -> new CustomException(ErrorCode.QNA_MENTORING_QUESTION_NOT_FOUND));
  }

  private List<AnswerResponse> getAnswerResponses(Long questionId) {
    return answerRepository
        .findAllByQuestionIdAndIsDeletedFalseOrderByCreatedAtAsc(questionId)
        .stream()
        .map(AnswerResponse::from)
        .toList();
  }

  private void validateMentoringMember(Mentoring mentoring, Long userId) {
    boolean mentor = mentoring.getMentor().getId().equals(userId);
    boolean mentee = mentoring.getMentee().getId().equals(userId);

    if (!mentor && !mentee) {
      throw new CustomException(ErrorCode.QNA_NOT_MENTORING_MEMBER);
    }
  }

  private void validateAnswerable(Question question) {
    if (question.getQnaStatus() == QnaStatus.ANSWERED) {
      throw new CustomException(ErrorCode.QNA_ALREADY_ANSWERED);
    }
  }

  private void validateQuestionStatus(QnaStatus status) {
    if (status != QnaStatus.UNANSWERED && status != QnaStatus.ANSWERED) {
      throw new CustomException(ErrorCode.QNA_INVALID_STATUS);
    }
  }

  private void sendAnswerNotification(Question question, User answerer) {
    Long receiverId = question.getUser().getId();

    if (receiverId.equals(answerer.getId())) {
      return;
    }

    notificationEventService.notifyMentoringAnswerCreated(receiverId, question.getTitle());
  }
}
