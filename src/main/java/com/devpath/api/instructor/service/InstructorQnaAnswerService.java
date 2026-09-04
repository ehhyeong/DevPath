package com.devpath.api.instructor.service;

import com.devpath.api.instructor.dto.qna.QnaAnswerRequest;
import com.devpath.api.instructor.dto.qna.QnaAnswerResponse;
import com.devpath.api.instructor.dto.qna.QnaDraftRequest;
import com.devpath.api.instructor.dto.qna.QnaDraftResponse;
import com.devpath.api.instructor.dto.qna.QnaStatusUpdateRequest;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.instructor.entity.QnaAnswerDraft;
import com.devpath.domain.instructor.repository.QnaAnswerDraftRepository;
import com.devpath.domain.notification.service.SystemNotificationSender;
import com.devpath.domain.qna.entity.Answer;
import com.devpath.domain.qna.entity.QnaStatus;
import com.devpath.domain.qna.entity.Question;
import com.devpath.domain.qna.repository.AnswerRepository;
import com.devpath.domain.qna.service.QnaAnswerEventPublisher;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.entity.UserProfile;
import com.devpath.domain.user.repository.UserProfileRepository;
import com.devpath.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class InstructorQnaAnswerService {

  private final AnswerRepository answerRepository;
  private final UserRepository userRepository;
  private final UserProfileRepository userProfileRepository;
  private final QnaAnswerDraftRepository draftRepository;
  private final InstructorQnaQuestionAccess questionAccess;
  private final QnaAnswerEventPublisher answerEventPublisher;
  private final SystemNotificationSender notificationSender;

  public void updateStatus(Long questionId, Long instructorId, QnaStatusUpdateRequest request) {
    Question question = questionAccess.getManagedQuestion(questionId, instructorId);
    boolean hasPublishedAnswer =
        answerRepository.findFirstByQuestionIdAndIsDeletedFalse(questionId).isPresent();

    if (request.getStatus() == QnaStatus.ANSWERED && !hasPublishedAnswer) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }
    if (request.getStatus() == QnaStatus.UNANSWERED && hasPublishedAnswer) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }

    question.updateQnaStatus(request.getStatus());
  }

  public QnaDraftResponse saveDraft(Long questionId, Long instructorId, QnaDraftRequest request) {
    questionAccess.getManagedQuestion(questionId, instructorId);
    QnaAnswerDraft draft =
        draftRepository
            .findByQuestionIdAndInstructorIdAndIsDeletedFalse(questionId, instructorId)
            .orElse(null);

    if (draft != null) {
      draft.updateDraft(request.getDraftContent());
    } else {
      draft =
          draftRepository.save(
              QnaAnswerDraft.builder()
                  .questionId(questionId)
                  .instructorId(instructorId)
                  .draftContent(request.getDraftContent())
                  .build());
    }

    return QnaDraftResponse.from(draft);
  }

  public QnaAnswerResponse createAnswer(
      Long questionId, Long instructorId, QnaAnswerRequest request) {
    Question question = questionAccess.getManagedQuestion(questionId, instructorId);

    if (answerRepository.findFirstByQuestionIdAndIsDeletedFalse(questionId).isPresent()) {
      throw new CustomException(ErrorCode.DUPLICATE_RESOURCE);
    }

    User instructor =
        userRepository
            .findById(instructorId)
            .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
    Answer saved =
        answerRepository.save(
            Answer.builder()
                .question(question)
                .user(instructor)
                .content(request.getContent())
                .build());

    draftRepository
        .findByQuestionIdAndInstructorIdAndIsDeletedFalse(questionId, instructorId)
        .ifPresent(QnaAnswerDraft::deleteDraft);
    question.markAsAnswered();
    answerEventPublisher.answerCreated(question, saved.getId());
    notificationSender.sendSystemNotification(
        question.getUser().getId(), "QnA 질문에 답변이 등록되었습니다: " + question.getTitle());

    return QnaAnswerResponse.from(
        saved,
        getInstructorDisplayName(saved.getUser().getId()),
        getInstructorProfileImage(saved.getUser().getId()));
  }

  public QnaAnswerResponse updateAnswer(
      Long questionId, Long answerId, Long instructorId, QnaAnswerRequest request) {
    Question question = questionAccess.getManagedQuestion(questionId, instructorId);
    Answer answer =
        answerRepository
            .findByQuestion_IdAndIdAndIsDeletedFalse(questionId, answerId)
            .orElseThrow(() -> new CustomException(ErrorCode.ANSWER_NOT_FOUND));

    if (!answer.getUser().getId().equals(instructorId)) {
      throw new CustomException(ErrorCode.UNAUTHORIZED_ACTION);
    }

    answer.updateContent(request.getContent());
    answerEventPublisher.answerUpdated(question, answer.getId());
    draftRepository
        .findByQuestionIdAndInstructorIdAndIsDeletedFalse(questionId, instructorId)
        .ifPresent(QnaAnswerDraft::deleteDraft);

    return QnaAnswerResponse.from(
        answer,
        getInstructorDisplayName(answer.getUser().getId()),
        getInstructorProfileImage(answer.getUser().getId()));
  }

  private String getInstructorDisplayName(Long instructorId) {
    return userRepository.findById(instructorId).map(User::getName).orElse("강사");
  }

  private String getInstructorProfileImage(Long instructorId) {
    return userProfileRepository
        .findByUserId(instructorId)
        .map(UserProfile::getDisplayProfileImage)
        .orElse(null);
  }
}
