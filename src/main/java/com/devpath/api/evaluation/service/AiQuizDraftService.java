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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class AiQuizDraftService {

  private final AtomicLong draftSequence = new AtomicLong(1L);
  private final AtomicLong draftQuestionSequence = new AtomicLong(1L);
  private final AtomicLong draftOptionSequence = new AtomicLong(1L);
  private final AtomicLong adoptedDraftCount = new AtomicLong(0L);
  private final Map<Long, DraftState> draftStore = new ConcurrentHashMap<>();

  private final UserRepository userRepository;
  private final RoadmapNodeRepository roadmapNodeRepository;
  private final QuizRepository quizRepository;

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
    draft.questions = generateMockQuestions(request);

    draftStore.put(draft.draftId, draft);
    return toDraftResponse(draft);
  }

  public AiQuizDraftResponse adoptDraft(
      Long userId, Long draftId, AdoptAiQuizDraftRequest request) {
    validateInstructor(userId);

    DraftState draft = getDraft(draftId);
    validateDraftActionable(draft);
    validateDraftQuestions(draft.questions);

    RoadmapNode roadmapNode = getRoadmapNode(draft.nodeId);
    int totalScore =
        draft.questions.stream().mapToInt(question -> question.points == null ? 0 : question.points).sum();

    Quiz quiz =
        Quiz.builder()
            .roadmapNode(roadmapNode)
            .title(isBlank(request.getTitle()) ? draft.title : request.getTitle())
            .description(isBlank(request.getDescription()) ? draft.description : request.getDescription())
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
                ? draftQuestionSequence.getAndIncrement()
                : questionRequest.getDraftQuestionId();
        question.questionType =
            questionRequest.getQuestionType() == null
                ? QuestionType.MULTIPLE_CHOICE
                : questionRequest.getQuestionType();
        question.questionText = questionRequest.getQuestionText();
        question.explanation = questionRequest.getExplanation();
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
                    ? draftOptionSequence.getAndIncrement()
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
          option.draftOptionId = draftOptionSequence.getAndIncrement();
          option.optionText = "핵심 개념";
          option.correct = true;
          option.displayOrder = 1;
          question.options.add(option);
        }

        replacedQuestions.add(question);
      }

      validateDraftQuestions(replacedQuestions);
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

  private List<DraftQuestionState> generateMockQuestions(CreateAiQuizDraftRequest request) {
    int questionCount = request.getQuestionCount() == null ? 3 : request.getQuestionCount();
    String keyword = extractKeyword(request.getSourceText());

    List<DraftQuestionState> questions = new ArrayList<>();
    for (int index = 1; index <= questionCount; index++) {
      QuestionType questionType = resolveQuestionType(request.getPreferredQuestionType(), index);
      DraftQuestionState question = new DraftQuestionState();
      question.draftQuestionId = draftQuestionSequence.getAndIncrement();
      question.questionType = questionType;
      question.points = 5;
      question.displayOrder = index;
      question.sourceTimestamp = request.getSourceTimestamp();
      question.options = new ArrayList<>();

      if (questionType == QuestionType.SHORT_ANSWER) {
        question.questionText = keyword + "와 관련된 핵심 개념을 간단히 설명하세요.";
        question.explanation = "근거 원문에서 '" + keyword + "'와 연결되는 핵심 문장을 요약하면 됩니다.";

        DraftOptionState option = new DraftOptionState();
        option.draftOptionId = draftOptionSequence.getAndIncrement();
        option.optionText = keyword;
        option.correct = true;
        option.displayOrder = 1;
        question.options.add(option);
      } else if (questionType == QuestionType.TRUE_FALSE) {
        question.questionText = "'" + keyword + "'는 보안과 인증/인가 맥락과 관련이 있다.";
        question.explanation = "근거 원문에서 해당 개념이 보안 흐름과 연결되어 설명됩니다.";

        DraftOptionState option1 = new DraftOptionState();
        option1.draftOptionId = draftOptionSequence.getAndIncrement();
        option1.optionText = "O";
        option1.correct = true;
        option1.displayOrder = 1;

        DraftOptionState option2 = new DraftOptionState();
        option2.draftOptionId = draftOptionSequence.getAndIncrement();
        option2.optionText = "X";
        option2.correct = false;
        option2.displayOrder = 2;

        question.options.add(option1);
        question.options.add(option2);
      } else {
        question.questionText = "다음 중 '" + keyword + "'와 가장 관련 깊은 설명은 무엇인가?";
        question.explanation = "근거 원문에서 직접적으로 언급된 핵심 설명을 정답으로 둡니다.";

        DraftOptionState option1 = new DraftOptionState();
        option1.draftOptionId = draftOptionSequence.getAndIncrement();
        option1.optionText = keyword + "는 인증과 인가 흐름과 관련된 핵심 개념이다.";
        option1.correct = true;
        option1.displayOrder = 1;

        DraftOptionState option2 = new DraftOptionState();
        option2.draftOptionId = draftOptionSequence.getAndIncrement();
        option2.optionText = keyword + "는 프론트엔드 CSS 전용 개념이다.";
        option2.correct = false;
        option2.displayOrder = 2;

        DraftOptionState option3 = new DraftOptionState();
        option3.draftOptionId = draftOptionSequence.getAndIncrement();
        option3.optionText = keyword + "는 데이터베이스 물리 설계만 담당한다.";
        option3.correct = false;
        option3.displayOrder = 3;

        DraftOptionState option4 = new DraftOptionState();
        option4.draftOptionId = draftOptionSequence.getAndIncrement();
        option4.optionText = keyword + "는 네트워크 하드웨어 장비 이름이다.";
        option4.correct = false;
        option4.displayOrder = 4;

        question.options.add(option1);
        question.options.add(option2);
        question.options.add(option3);
        question.options.add(option4);
      }

      questions.add(question);
    }

    validateDraftQuestions(questions);
    return questions;
  }

  private QuestionType resolveQuestionType(QuestionType preferredQuestionType, int index) {
    if (preferredQuestionType != null) {
      return preferredQuestionType;
    }

    if (index % 3 == 0) {
      return QuestionType.SHORT_ANSWER;
    }

    if (index % 2 == 0) {
      return QuestionType.TRUE_FALSE;
    }

    return QuestionType.MULTIPLE_CHOICE;
  }

  private void validateDraftQuestions(List<DraftQuestionState> questions) {
    if (questions == null || questions.isEmpty()) {
      throw new CustomException(ErrorCode.INVALID_INPUT, "초안 문항은 최소 1개 이상 필요합니다.");
    }

    for (DraftQuestionState question : questions) {
      if (isBlank(question.questionText)) {
        throw new CustomException(ErrorCode.INVALID_INPUT, "문항 본문은 비어 있을 수 없습니다.");
      }

      if (question.points == null || question.points < 0) {
        throw new CustomException(ErrorCode.INVALID_INPUT, "문항 배점은 0 이상이어야 합니다.");
      }

      if (question.displayOrder == null || question.displayOrder < 1) {
        throw new CustomException(ErrorCode.INVALID_INPUT, "문항 노출 순서는 1 이상이어야 합니다.");
      }

      validateDraftOptions(question);
    }
  }

  private void validateDraftOptions(DraftQuestionState question) {
    if (question.options == null || question.options.isEmpty()) {
      throw new CustomException(ErrorCode.INVALID_INPUT, "문항 선택지는 최소 1개 이상 필요합니다.");
    }

    long correctOptionCount =
        question.options.stream().filter(option -> Boolean.TRUE.equals(option.correct)).count();

    if (question.questionType == QuestionType.MULTIPLE_CHOICE) {
      if (question.options.size() < 2) {
        throw new CustomException(ErrorCode.INVALID_INPUT, "객관식 초안은 선택지가 최소 2개 이상 필요합니다.");
      }
      if (correctOptionCount < 1) {
        throw new CustomException(ErrorCode.INVALID_INPUT, "객관식 초안은 정답 선택지가 최소 1개 필요합니다.");
      }
      return;
    }

    if (question.questionType == QuestionType.TRUE_FALSE) {
      if (question.options.size() != 2) {
        throw new CustomException(ErrorCode.INVALID_INPUT, "OX 초안은 선택지가 정확히 2개여야 합니다.");
      }
      if (correctOptionCount != 1) {
        throw new CustomException(ErrorCode.INVALID_INPUT, "OX 초안은 정답 선택지가 정확히 1개여야 합니다.");
      }
      return;
    }

    if (question.questionType == QuestionType.SHORT_ANSWER) {
      if (question.options.size() != 1) {
        throw new CustomException(ErrorCode.INVALID_INPUT, "주관식 초안은 정답 선택지가 1개여야 합니다.");
      }
      if (correctOptionCount != 1) {
        throw new CustomException(ErrorCode.INVALID_INPUT, "주관식 초안 정답은 반드시 1개여야 합니다.");
      }
    }
  }

  private String extractKeyword(String sourceText) {
    if (sourceText == null || sourceText.isBlank()) {
      return "핵심 개념";
    }

    String normalized = sourceText.replace("\n", " ").replace("\r", " ").trim();
    String[] tokens = normalized.split("\\s+");
    if (tokens.length == 0) {
      return "핵심 개념";
    }

    String candidate = tokens[0];
    return candidate.length() > 20 ? candidate.substring(0, 20) : candidate;
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

  private static class DraftQuestionState {
    private Long draftQuestionId;
    private QuestionType questionType;
    private String questionText;
    private String explanation;
    private Integer points;
    private Integer displayOrder;
    private String sourceTimestamp;
    private List<DraftOptionState> options = new ArrayList<>();
  }

  private static class DraftOptionState {
    private Long draftOptionId;
    private String optionText;
    private Boolean correct;
    private Integer displayOrder;
  }
}
