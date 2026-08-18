package com.devpath.api.evaluation.service;

import com.devpath.api.evaluation.dto.request.AdoptAiQuizDraftRequest;
import com.devpath.api.evaluation.dto.request.CreateAiQuizDraftRequest;
import com.devpath.api.evaluation.dto.request.RejectAiQuizDraftRequest;
import com.devpath.api.evaluation.dto.request.UpdateAiQuizDraftRequest;
import com.devpath.api.evaluation.dto.response.AiQuizDraftResponse;
import com.devpath.api.evaluation.dto.response.AiQuizEvidenceResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.learning.entity.QuestionType;
import com.devpath.domain.learning.entity.Quiz;
import com.devpath.domain.learning.entity.QuizQuestion;
import com.devpath.domain.learning.entity.QuizQuestionOption;
import com.devpath.domain.learning.entity.QuizType;
import com.devpath.domain.learning.repository.QuizRepository;
import com.devpath.domain.roadmap.entity.RoadmapNode;
import com.devpath.domain.roadmap.repository.RoadmapNodeRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.entity.UserRole;
import com.devpath.domain.user.repository.UserRepository;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class AiQuizDraftService {

  private final AtomicLong draftSequence = new AtomicLong(1L);
  private final AtomicLong adoptedDraftCount = new AtomicLong(0L);
  private final Map<Long, DraftState> draftStore = new ConcurrentHashMap<>();

  private final UserRepository userRepository;
  private final RoadmapNodeRepository roadmapNodeRepository;
  private final QuizRepository quizRepository;
  private final AiQuizDraftQuestionGenerator questionGenerator;

  public AiQuizDraftResponse createDraft(Long userId, CreateAiQuizDraftRequest request) {
    validateInstructor(userId);
    RoadmapNode roadmapNode = getRoadmapNode(request.getNodeId());

    DraftState draft = new DraftState();
    draft.draftId = draftSequence.getAndIncrement();
    draft.nodeId = roadmapNode.getNodeId();
    draft.title = request.getTitle();
    draft.description = request.getDescription();
    draft.quizType = normalizeQuizType(request.getQuizType());
    draft.sourceText = request.getSourceText();
    draft.sourceTimestamp = request.getSourceTimestamp();
    draft.status = DraftStatus.DRAFT.name();
    draft.createdAt = LocalDateTime.now();
    draft.questions = questionGenerator.generate(roadmapNode, request);

    draftStore.put(draft.draftId, draft);
    return toDraftResponse(draft);
  }

  public AiQuizDraftResponse adoptDraft(
      Long userId, Long draftId, AdoptAiQuizDraftRequest request) {
    validateInstructor(userId);

    DraftState draft = getDraft(draftId);
    validateDraftActionable(draft);
    questionGenerator.validateQuestions(draft.questions);

    RoadmapNode roadmapNode = getRoadmapNode(draft.nodeId);
    int totalScore =
        draft.questions.stream()
            .mapToInt(question -> question.points == null ? 0 : question.points)
            .sum();

    Quiz quiz =
        Quiz.builder()
            .roadmapNode(roadmapNode)
            .title(isBlank(request.getTitle()) ? draft.title : request.getTitle())
            .description(
                isBlank(request.getDescription()) ? draft.description : request.getDescription())
            .quizType(draft.quizType)
            .totalScore(totalScore)
            .isPublished(Boolean.TRUE.equals(request.getPublish()))
            .isActive(true)
            .exposeAnswer(Boolean.TRUE.equals(request.getExposeAnswer()))
            .exposeExplanation(Boolean.TRUE.equals(request.getExposeExplanation()))
            .build();

    for (DraftQuestionState questionDraft : draft.questions) {
      QuizQuestion question =
          QuizQuestion.builder()
              .questionType(questionDraft.questionType)
              .questionText(questionDraft.questionText)
              .explanation(questionDraft.explanation)
              .points(questionDraft.points)
              .displayOrder(questionDraft.displayOrder)
              .sourceTimestamp(questionDraft.sourceTimestamp)
              .build();

      for (DraftOptionState optionDraft : questionDraft.options) {
        QuizQuestionOption option =
            QuizQuestionOption.builder()
                .optionText(optionDraft.optionText)
                .isCorrect(optionDraft.correct)
                .displayOrder(optionDraft.displayOrder)
                .build();
        question.addOption(option);
      }

      quiz.addQuestion(question);
    }

    Quiz savedQuiz = quizRepository.save(quiz);

    draft.status = DraftStatus.ADOPTED.name();
    draft.adoptedQuizId = savedQuiz.getId();
    draft.rejectedReason = null;
    adoptedDraftCount.incrementAndGet();

    return toDraftResponse(draft);
  }

  public AiQuizDraftResponse rejectDraft(
      Long userId, Long draftId, RejectAiQuizDraftRequest request) {
    validateInstructor(userId);

    DraftState draft = getDraft(draftId);
    validateDraftActionable(draft);

    draft.status = DraftStatus.REJECTED.name();
    draft.rejectedReason = request.getReason();

    return toDraftResponse(draft);
  }

  public AiQuizDraftResponse updateDraft(
      Long userId, Long draftId, UpdateAiQuizDraftRequest request) {
    validateInstructor(userId);

    DraftState draft = getDraft(draftId);
    validateDraftActionable(draft);

    if (!isBlank(request.getTitle())) {
      draft.title = request.getTitle();
    }

    if (request.getDescription() != null) {
      draft.description = request.getDescription();
    }

    if (request.getQuestions() != null && !request.getQuestions().isEmpty()) {
      List<DraftQuestionState> replacedQuestions = new ArrayList<>();

      for (UpdateAiQuizDraftRequest.DraftQuestionUpdateRequest questionRequest :
          request.getQuestions()) {
        DraftQuestionState question = new DraftQuestionState();
        question.draftQuestionId =
            questionRequest.getDraftQuestionId() == null
                ? questionGenerator.nextQuestionId()
                : questionRequest.getDraftQuestionId();
        question.questionType =
            questionRequest.getQuestionType() == null
                ? QuestionType.MULTIPLE_CHOICE
                : questionRequest.getQuestionType();
        question.questionText = questionRequest.getQuestionText();
        question.explanation =
            questionGenerator.normalizeExplanation(questionRequest.getExplanation());
        question.points = questionRequest.getPoints() == null ? 5 : questionRequest.getPoints();
        question.displayOrder =
            questionRequest.getDisplayOrder() == null
                ? replacedQuestions.size() + 1
                : questionRequest.getDisplayOrder();
        question.sourceTimestamp = questionRequest.getSourceTimestamp();
        question.options = new ArrayList<>();

        if (questionRequest.getOptions() != null) {
          for (UpdateAiQuizDraftRequest.DraftOptionUpdateRequest optionRequest :
              questionRequest.getOptions()) {
            DraftOptionState option = new DraftOptionState();
            option.draftOptionId =
                optionRequest.getDraftOptionId() == null
                    ? questionGenerator.nextOptionId()
                    : optionRequest.getDraftOptionId();
            option.optionText = optionRequest.getOptionText();
            option.correct = Boolean.TRUE.equals(optionRequest.getCorrect());
            option.displayOrder =
                optionRequest.getDisplayOrder() == null
                    ? question.options.size() + 1
                    : optionRequest.getDisplayOrder();
            question.options.add(option);
          }
        }

        if (question.questionType == QuestionType.SHORT_ANSWER && question.options.isEmpty()) {
          DraftOptionState option = new DraftOptionState();
          option.draftOptionId = questionGenerator.nextOptionId();
          option.optionText = "핵심 개념";
          option.correct = true;
          option.displayOrder = 1;
          question.options.add(option);
        }

        replacedQuestions.add(question);
      }

      questionGenerator.validateQuestions(replacedQuestions);
      draft.questions = replacedQuestions;
    }

    return toDraftResponse(draft);
  }

  @Transactional(readOnly = true)
  public AiQuizEvidenceResponse getEvidence(Long userId, Long draftId) {
    validateInstructor(userId);

    DraftState draft = getDraft(draftId);
    List<AiQuizEvidenceResponse.EvidenceItem> evidenceItems =
        draft.questions.stream()
            .map(
                question ->
                    AiQuizEvidenceResponse.EvidenceItem.builder()
                        .draftQuestionId(question.draftQuestionId)
                        .questionText(question.questionText)
                        .evidenceExcerpt(extractEvidenceExcerpt(draft.sourceText))
                        .evidenceTimestamp(
                            question.sourceTimestamp == null
                                ? draft.sourceTimestamp
                                : question.sourceTimestamp)
                        .build())
            .toList();

    return AiQuizEvidenceResponse.builder()
        .draftId(draft.draftId)
        .title(draft.title)
        .sourceText(draft.sourceText)
        .sourceTimestamp(draft.sourceTimestamp)
        .evidences(evidenceItems)
        .build();
  }

  @Transactional(readOnly = true)
  public long getAdoptedDraftCount() {
    return adoptedDraftCount.get();
  }

  private User validateInstructor(Long userId) {
    User instructor =
        userRepository
            .findById(userId)
            .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

    if (instructor.getRole() != UserRole.ROLE_INSTRUCTOR) {
      throw new CustomException(ErrorCode.FORBIDDEN, "강사만 AI 퀴즈 초안을 관리할 수 있습니다.");
    }

    if (!Boolean.TRUE.equals(instructor.getIsActive())) {
      throw new CustomException(ErrorCode.FORBIDDEN, "비활성 사용자입니다.");
    }

    return instructor;
  }

  private RoadmapNode getRoadmapNode(Long nodeId) {
    return roadmapNodeRepository
        .findById(nodeId)
        .orElseThrow(() -> new CustomException(ErrorCode.ROADMAP_NODE_NOT_FOUND));
  }

  private DraftState getDraft(Long draftId) {
    DraftState draft = draftStore.get(draftId);
    if (draft == null) {
      throw new CustomException(ErrorCode.RESOURCE_NOT_FOUND, "AI 퀴즈 초안을 찾을 수 없습니다.");
    }
    return draft;
  }

  private void validateDraftActionable(DraftState draft) {
    if (Objects.equals(draft.status, DraftStatus.ADOPTED.name())) {
      throw new CustomException(ErrorCode.INVALID_INPUT, "이미 채택된 AI 초안입니다.");
    }

    if (Objects.equals(draft.status, DraftStatus.REJECTED.name())) {
      throw new CustomException(ErrorCode.INVALID_INPUT, "이미 거부된 AI 초안입니다.");
    }
  }

  private QuizType normalizeQuizType(QuizType quizType) {
    if (quizType == null || quizType == QuizType.MANUAL) {
      return QuizType.AI_TOPIC;
    }
    return quizType;
  }

  private String extractEvidenceExcerpt(String sourceText) {
    if (sourceText == null || sourceText.isBlank()) {
      return "";
    }

    String normalized = sourceText.replace("\n", " ").replace("\r", " ").trim();
    return normalized.length() <= 120 ? normalized : normalized.substring(0, 120) + "...";
  }

  private boolean isBlank(String value) {
    return value == null || value.isBlank();
  }

  private AiQuizDraftResponse toDraftResponse(DraftState draft) {
    List<AiQuizDraftResponse.QuestionDraftItem> questionItems =
        draft.questions.stream()
            .map(
                question ->
                    AiQuizDraftResponse.QuestionDraftItem.builder()
                        .draftQuestionId(question.draftQuestionId)
                        .questionType(question.questionType)
                        .questionText(question.questionText)
                        .explanation(question.explanation)
                        .points(question.points)
                        .displayOrder(question.displayOrder)
                        .sourceTimestamp(question.sourceTimestamp)
                        .options(
                            question.options.stream()
                                .map(
                                    option ->
                                        AiQuizDraftResponse.OptionDraftItem.builder()
                                            .draftOptionId(option.draftOptionId)
                                            .optionText(option.optionText)
                                            .correct(option.correct)
                                            .displayOrder(option.displayOrder)
                                            .build())
                                .toList())
                        .build())
            .toList();

    return AiQuizDraftResponse.builder()
        .draftId(draft.draftId)
        .nodeId(draft.nodeId)
        .title(draft.title)
        .description(draft.description)
        .quizType(draft.quizType)
        .status(draft.status)
        .sourceTimestamp(draft.sourceTimestamp)
        .questionCount(draft.questions.size())
        .adoptedQuizId(draft.adoptedQuizId)
        .rejectedReason(draft.rejectedReason)
        .createdAt(draft.createdAt)
        .questions(questionItems)
        .build();
  }

  private enum DraftStatus {
    DRAFT,
    ADOPTED,
    REJECTED
  }

  private static class DraftState {
    private Long draftId;
    private Long nodeId;
    private String title;
    private String description;
    private QuizType quizType;
    private String sourceText;
    private String sourceTimestamp;
    private String status;
    private Long adoptedQuizId;
    private String rejectedReason;
    private LocalDateTime createdAt;
    private List<DraftQuestionState> questions = new ArrayList<>();
  }
}
