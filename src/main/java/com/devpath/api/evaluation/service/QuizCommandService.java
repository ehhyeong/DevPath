package com.devpath.api.evaluation.service;

import com.devpath.api.evaluation.dto.request.CreateQuizQuestionOptionRequest;
import com.devpath.api.evaluation.dto.request.CreateQuizQuestionRequest;
import com.devpath.api.evaluation.dto.request.CreateQuizRequest;
import com.devpath.api.evaluation.dto.request.UpdateQuizAnswerExplanationRequest;
import com.devpath.api.evaluation.dto.response.QuizDetailResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.learning.entity.QuestionType;
import com.devpath.domain.learning.entity.Quiz;
import com.devpath.domain.learning.entity.QuizQuestion;
import com.devpath.domain.learning.entity.QuizQuestionOption;
import com.devpath.domain.learning.repository.QuizQuestionOptionRepository;
import com.devpath.domain.learning.repository.QuizQuestionRepository;
import com.devpath.domain.learning.repository.QuizRepository;
import com.devpath.domain.roadmap.entity.RoadmapNode;
import com.devpath.domain.roadmap.repository.RoadmapNodeRepository;
import com.devpath.domain.user.repository.UserRepository;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class QuizCommandService {

  // 사용자 존재 여부 확인용 리포지토리다.
  private final UserRepository userRepository;

  // 로드맵 노드 조회용 리포지토리다.
  private final RoadmapNodeRepository roadmapNodeRepository;

  // 퀴즈 저장 및 조회용 리포지토리다.
  private final QuizRepository quizRepository;

  // 퀴즈 문항 저장 및 조회용 리포지토리다.
  private final QuizQuestionRepository quizQuestionRepository;

  // 퀴즈 선택지 저장 및 조회용 리포지토리다.
  private final QuizQuestionOptionRepository quizQuestionOptionRepository;

  // 강사가 퀴즈 루트 정보를 생성한다.
  public QuizDetailResponse createQuiz(Long instructorUserId, CreateQuizRequest request) {
    validateUserExists(instructorUserId);

    RoadmapNode roadmapNode =
        roadmapNodeRepository
            .findById(request.getRoadmapNodeId())
            .orElseThrow(() -> new CustomException(ErrorCode.ROADMAP_NODE_NOT_FOUND));

    Quiz quiz =
        Quiz.builder()
            .roadmapNode(roadmapNode)
            .title(request.getTitle())
            .description(request.getDescription())
            .quizType(request.getQuizType())
            .totalScore(request.getTotalScore())
            .isPublished(request.getIsPublished())
            .isActive(request.getIsActive())
            .exposeAnswer(request.getExposeAnswer())
            .exposeExplanation(request.getExposeExplanation())
            .build();

    Quiz savedQuiz = quizRepository.save(quiz);
    return QuizDetailResponse.from(savedQuiz);
  }

  // 강사가 특정 퀴즈에 문항과 선택지를 추가한다.
  public QuizDetailResponse addQuestion(Long instructorUserId, Long quizId, CreateQuizQuestionRequest request) {
    validateUserExists(instructorUserId);

    Quiz quiz =
        quizRepository
            .findByIdAndIsDeletedFalse(quizId)
            .orElseThrow(() -> new CustomException(ErrorCode.RESOURCE_NOT_FOUND, "퀴즈를 찾을 수 없습니다."));

    validateQuestionRequest(request);

    QuizQuestion question =
        QuizQuestion.builder()
            .questionType(request.getQuestionType())
            .questionText(request.getQuestionText())
            .explanation(request.getExplanation())
            .points(request.getPoints())
            .displayOrder(request.getDisplayOrder())
            .sourceTimestamp(request.getSourceTimestamp())
            .build();

    for (CreateQuizQuestionOptionRequest optionRequest : request.getOptions()) {
      QuizQuestionOption option =
          QuizQuestionOption.builder()
              .optionText(optionRequest.getOptionText())
              .isCorrect(optionRequest.getIsCorrect())
              .displayOrder(optionRequest.getDisplayOrder())
              .build();

      question.addOption(option);
    }

    quiz.addQuestion(question);

    // 문항 추가 후 총점을 현재 문항 합계 기준으로 다시 맞춘다.
    quiz.updateInfo(
        quiz.getTitle(), quiz.getDescription(), quiz.getQuizType(), calculateQuizTotalScore(quiz));

    Quiz savedQuiz = quizRepository.save(quiz);
    return QuizDetailResponse.from(savedQuiz);
  }

  // 강사가 특정 문항의 정답과 해설을 저장한다.
  public QuizDetailResponse updateAnswerAndExplanation(
      Long instructorUserId,
      Long quizId,
      Long questionId,
      UpdateQuizAnswerExplanationRequest request) {
    validateUserExists(instructorUserId);

    Quiz quiz =
        quizRepository
            .findByIdAndIsDeletedFalse(quizId)
            .orElseThrow(() -> new CustomException(ErrorCode.RESOURCE_NOT_FOUND, "퀴즈를 찾을 수 없습니다."));

    QuizQuestion question =
        quizQuestionRepository
            .findByIdAndIsDeletedFalse(questionId)
            .orElseThrow(() -> new CustomException(ErrorCode.RESOURCE_NOT_FOUND, "문항을 찾을 수 없습니다."));

    if (!question.getQuiz().getId().equals(quiz.getId())) {
      throw new CustomException(ErrorCode.RESOURCE_NOT_FOUND, "해당 퀴즈에 속한 문항이 아닙니다.");
    }

    if (request.getCorrectOptionIds() == null || request.getCorrectOptionIds().isEmpty()) {
      throw new CustomException(ErrorCode.INVALID_INPUT, "정답 선택지 ID는 최소 1개 이상이어야 합니다.");
    }

    Set<Long> correctOptionIdSet = new HashSet<>(request.getCorrectOptionIds());

    List<QuizQuestionOption> options =
        quizQuestionOptionRepository.findAllByQuestionIdAndIsDeletedFalseOrderByDisplayOrderAsc(
            questionId);

    if (options.isEmpty()) {
      throw new CustomException(ErrorCode.INVALID_INPUT, "정답을 저장할 선택지가 존재하지 않습니다.");
    }

    question.updateContent(
        question.getQuestionType(),
        question.getQuestionText(),
        request.getExplanation(),
        question.getPoints(),
        question.getDisplayOrder(),
        request.getSourceTimestamp());

    for (QuizQuestionOption option : options) {
      boolean isCorrect = correctOptionIdSet.contains(option.getId());
      option.updateOption(option.getOptionText(), isCorrect, option.getDisplayOrder());
    }

    quizQuestionRepository.save(question);

    return QuizDetailResponse.from(quiz);
  }

  // 요청한 사용자 ID가 실제 users 테이블에 존재하는지 검증한다.
  private void validateUserExists(Long userId) {
    if (!userRepository.existsById(userId)) {
      throw new CustomException(ErrorCode.USER_NOT_FOUND);
    }
  }

  // 문항 생성 요청이 문항 유형에 맞는 최소 조건을 만족하는지 검증한다.
  private void validateQuestionRequest(CreateQuizQuestionRequest request) {
    if (request.getOptions() == null || request.getOptions().isEmpty()) {
      throw new CustomException(ErrorCode.INVALID_INPUT, "문항 생성 시 선택지는 최소 1개 이상 필요합니다.");
    }

    if (request.getQuestionType() == QuestionType.MULTIPLE_CHOICE && request.getOptions().size() < 2) {
      throw new CustomException(ErrorCode.INVALID_INPUT, "객관식 문항은 선택지가 최소 2개 이상 필요합니다.");
    }

    if (request.getQuestionType() == QuestionType.TRUE_FALSE && request.getOptions().size() != 2) {
      throw new CustomException(ErrorCode.INVALID_INPUT, "OX 문항은 선택지를 정확히 2개 등록해야 합니다.");
    }

    // 주관식은 현재 엔티티 구조상 정답 텍스트를 optionText 1개에 저장하는 방식으로 처리한다.
    if (request.getQuestionType() == QuestionType.SHORT_ANSWER && request.getOptions().size() != 1) {
      throw new CustomException(ErrorCode.INVALID_INPUT, "주관식 문항은 정답 텍스트 저장용 선택지 1개가 필요합니다.");
    }
  }

  // 퀴즈의 살아있는 문항 배점을 모두 더해 총점을 계산한다.
  private int calculateQuizTotalScore(Quiz quiz) {
    return quiz.getQuestions().stream()
        .filter(question -> !Boolean.TRUE.equals(question.getIsDeleted()))
        .mapToInt(QuizQuestion::getPoints)
        .sum();
  }
}
