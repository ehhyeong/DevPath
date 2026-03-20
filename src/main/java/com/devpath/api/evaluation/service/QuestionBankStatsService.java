package com.devpath.api.evaluation.service;

import com.devpath.api.evaluation.dto.response.QuestionBankStatsResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.learning.entity.QuestionType;
import com.devpath.domain.learning.entity.Quiz;
import com.devpath.domain.learning.entity.QuizQuestion;
import com.devpath.domain.learning.repository.QuizQuestionRepository;
import com.devpath.domain.learning.repository.QuizRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.entity.UserRole;
import com.devpath.domain.user.repository.UserRepository;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class QuestionBankStatsService {

  private final UserRepository userRepository;
  private final QuizRepository quizRepository;
  private final QuizQuestionRepository quizQuestionRepository;
  private final AiQuizDraftService aiQuizDraftService;

  public QuestionBankStatsResponse getQuestionBankStats(Long userId) {
    validateInstructor(userId);

    List<Quiz> quizzes =
        quizRepository.findAll().stream().filter(quiz -> !Boolean.TRUE.equals(quiz.getIsDeleted())).toList();
    List<QuizQuestion> questions =
        quizQuestionRepository.findAll().stream()
            .filter(question -> !Boolean.TRUE.equals(question.getIsDeleted()))
            .toList();

    long totalQuestionCount = questions.size();
    long multipleChoiceCount =
        questions.stream()
            .filter(question -> question.getQuestionType() == QuestionType.MULTIPLE_CHOICE)
            .count();
    long trueFalseCount =
        questions.stream()
            .filter(question -> question.getQuestionType() == QuestionType.TRUE_FALSE)
            .count();
    long shortAnswerCount =
        questions.stream()
            .filter(question -> question.getQuestionType() == QuestionType.SHORT_ANSWER)
            .count();

    LocalDateTime sevenDaysAgo = LocalDateTime.now().minusDays(7);
    long recentCreatedQuestionCount =
        questions.stream()
            .filter(
                question ->
                    question.getCreatedAt() != null && question.getCreatedAt().isAfter(sevenDaysAgo))
            .count();

    Map<Long, Long> questionCountByQuizId =
        questions.stream()
            .collect(
                Collectors.groupingBy(
                    question -> question.getQuiz().getId(), Collectors.counting()));

    List<QuestionBankStatsResponse.QuizQuestionCountItem> quizItems =
        quizzes.stream()
            .sorted(Comparator.comparing(Quiz::getId))
            .map(
                quiz ->
                    QuestionBankStatsResponse.QuizQuestionCountItem.builder()
                        .quizId(quiz.getId())
                        .quizTitle(quiz.getTitle())
                        .quizType(quiz.getQuizType())
                        .questionCount(questionCountByQuizId.getOrDefault(quiz.getId(), 0L).intValue())
                        .build())
            .toList();

    return QuestionBankStatsResponse.builder()
        .totalQuestionCount(totalQuestionCount)
        .multipleChoiceCount(multipleChoiceCount)
        .trueFalseCount(trueFalseCount)
        .shortAnswerCount(shortAnswerCount)
        .recentCreatedQuestionCount(recentCreatedQuestionCount)
        .adoptedAiDraftCount(aiQuizDraftService.getAdoptedDraftCount())
        .quizzes(quizItems)
        .build();
  }

  private User validateInstructor(Long userId) {
    User instructor =
        userRepository
            .findById(userId)
            .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

    if (instructor.getRole() != UserRole.ROLE_INSTRUCTOR) {
      throw new CustomException(ErrorCode.FORBIDDEN, "강사만 문제 은행 통계를 조회할 수 있습니다.");
    }

    if (!Boolean.TRUE.equals(instructor.getIsActive())) {
      throw new CustomException(ErrorCode.FORBIDDEN, "비활성 사용자입니다.");
    }

    return instructor;
  }
}
