package com.devpath.api.workspace.service;

import com.devpath.api.notification.service.NotificationEventService;
import com.devpath.api.qna.dto.AnswerCreateRequest;
import com.devpath.api.qna.dto.AnswerResponse;
import com.devpath.api.qna.dto.QuestionCreateRequest;
import com.devpath.api.qna.dto.QuestionDetailResponse;
import com.devpath.api.qna.dto.QuestionStatusUpdateRequest;
import com.devpath.api.qna.dto.QuestionSummaryResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.qna.entity.Answer;
import com.devpath.domain.qna.entity.QnaStatus;
import com.devpath.domain.qna.entity.Question;
import com.devpath.domain.qna.entity.QuestionScope;
import com.devpath.domain.qna.repository.AnswerRepository;
import com.devpath.domain.qna.repository.QuestionRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import com.devpath.domain.workspace.entity.Workspace;
import com.devpath.domain.workspace.repository.WorkspaceMemberRepository;
import com.devpath.domain.workspace.repository.WorkspaceRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WorkspaceQuestionService {

  private final WorkspaceRepository workspaceRepository;
  private final WorkspaceMemberRepository workspaceMemberRepository;
  private final QuestionRepository questionRepository;
  private final AnswerRepository answerRepository;
  private final UserRepository userRepository;
  private final NotificationEventService notificationEventService;

  @Transactional
  public QuestionDetailResponse createQuestion(
      Long userId, Long workspaceId, QuestionCreateRequest request) {
    User user = getUser(userId);
    Workspace workspace = getActiveWorkspace(workspaceId);

    validateWorkspaceMember(workspace, user.getId());

    Question question =
        Question.builder()
            .user(user)
            .templateType(request.getTemplateType())
            .difficulty(request.getDifficulty())
            .title(request.getTitle())
            .content(request.getContent())
            .build();

    question.attachWorkspace(workspace.getId());

    Question savedQuestion = questionRepository.save(question);

    return QuestionDetailResponse.from(savedQuestion, List.of());
  }

  public List<QuestionSummaryResponse> getQuestions(Long userId, Long workspaceId) {
    User user = getUser(userId);
    Workspace workspace = getActiveWorkspace(workspaceId);

    validateWorkspaceMember(workspace, user.getId());

    return questionRepository
        .findAllByQuestionScopeAndWorkspaceIdAndIsDeletedFalseOrderByCreatedAtDesc(
            QuestionScope.WORKSPACE, workspace.getId())
        .stream()
        .map(QuestionSummaryResponse::from)
        .toList();
  }

  @Transactional
  public QuestionDetailResponse getQuestion(Long userId, Long questionId) {
    User user = getUser(userId);
    Question question = getActiveWorkspaceQuestion(questionId);
    Workspace workspace = getActiveWorkspace(question.getWorkspaceId());

    validateWorkspaceMember(workspace, user.getId());

    question.incrementViewCount();

    return QuestionDetailResponse.from(question, getAnswerResponses(question.getId()));
  }

  @Transactional
  public AnswerResponse createAnswer(Long userId, Long questionId, AnswerCreateRequest request) {
    User user = getUser(userId);
    Question question = getActiveWorkspaceQuestion(questionId);
    Workspace workspace = getActiveWorkspace(question.getWorkspaceId());

    validateWorkspaceMember(workspace, user.getId());
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
    Question question = getActiveWorkspaceQuestion(questionId);
    Workspace workspace = getActiveWorkspace(question.getWorkspaceId());

    validateWorkspaceMember(workspace, user.getId());
    validateQuestionStatus(request.getStatus());

    question.updateQnaStatus(request.getStatus());

    return QuestionDetailResponse.from(question, getAnswerResponses(question.getId()));
  }

  private User getUser(Long userId) {
    return userRepository
        .findById(userId)
        .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
  }

  private Workspace getActiveWorkspace(Long workspaceId) {
    return workspaceRepository
        .findByIdAndIsDeletedFalse(workspaceId)
        .orElseThrow(() -> new CustomException(ErrorCode.WORKSPACE_NOT_FOUND));
  }

  private Question getActiveWorkspaceQuestion(Long questionId) {
    return questionRepository
        .findByIdAndQuestionScopeAndIsDeletedFalse(questionId, QuestionScope.WORKSPACE)
        .orElseThrow(() -> new CustomException(ErrorCode.QNA_WORKSPACE_QUESTION_NOT_FOUND));
  }

  private List<AnswerResponse> getAnswerResponses(Long questionId) {
    return answerRepository.findAllByQuestionIdAndIsDeletedFalseOrderByCreatedAtAsc(questionId)
        .stream()
        .map(AnswerResponse::from)
        .toList();
  }

  private void validateWorkspaceMember(Workspace workspace, Long userId) {
    boolean owner = workspace.getOwnerId().equals(userId);
    boolean member =
        workspaceMemberRepository.existsByWorkspaceIdAndLearnerId(workspace.getId(), userId);

    if (!owner && !member) {
      throw new CustomException(ErrorCode.WORKSPACE_FORBIDDEN);
    }
  }

  private void validateAnswerable(Question question) {
    if (question.getQnaStatus() == QnaStatus.ANSWERED) {
      throw new CustomException(ErrorCode.INVALID_STATUS_TRANSITION, "이미 답변 완료 처리된 질문입니다.");
    }
  }

  private void validateQuestionStatus(QnaStatus status) {
    if (status != QnaStatus.UNANSWERED && status != QnaStatus.ANSWERED) {
      throw new CustomException(ErrorCode.INVALID_STATUS_TRANSITION);
    }
  }

  private void sendAnswerNotification(Question question, User answerer) {
    Long receiverId = question.getUser().getId();

    if (receiverId.equals(answerer.getId())) {
      return;
    }

    notificationEventService.notifySystem(
        receiverId, "워크스페이스 질문에 답변이 등록되었습니다: " + question.getTitle());
  }
}
