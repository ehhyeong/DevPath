package com.devpath.api.evaluation.service;

import com.devpath.api.evaluation.dto.request.SubmitQuizAnswerRequest;
import com.devpath.api.evaluation.dto.request.SubmitQuizAttemptRequest;
import com.devpath.api.evaluation.dto.response.QuizAttemptResultResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.learning.entity.QuestionType;
import com.devpath.domain.learning.entity.Quiz;
import com.devpath.domain.learning.entity.QuizAnswer;
import com.devpath.domain.learning.entity.QuizAttempt;
import com.devpath.domain.learning.entity.QuizQuestion;
import com.devpath.domain.learning.entity.QuizQuestionOption;
import com.devpath.domain.learning.repository.QuizAnswerRepository;
import com.devpath.domain.learning.repository.QuizAttemptRepository;
import com.devpath.domain.learning.repository.QuizQuestionOptionRepository;
import com.devpath.domain.learning.repository.QuizQuestionRepository;
import com.devpath.domain.learning.repository.QuizRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.entity.UserRole;
import com.devpath.domain.user.repository.UserRepository;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class QuizAttemptService {

    private final UserRepository userRepository;
    private final QuizRepository quizRepository;
    private final QuizQuestionRepository quizQuestionRepository;
    private final QuizQuestionOptionRepository quizQuestionOptionRepository;
    private final QuizAttemptRepository quizAttemptRepository;
    private final QuizAnswerRepository quizAnswerRepository;
    private final QuizResultQueryService quizResultQueryService;

    // 학습자가 퀴즈를 응시하고 채점 결과까지 즉시 생성한다.
    public QuizAttemptResultResponse submitQuizAttempt(Long userId, Long quizId, SubmitQuizAttemptRequest request) {
        User learner = getLearner(userId);
        Quiz quiz = getAvailableQuiz(quizId);

        List<QuizQuestion> questions = quizQuestionRepository.findAllByQuizIdAndIsDeletedFalseOrderByDisplayOrderAsc(quizId);
        if (questions.isEmpty()) {
            throw new CustomException(ErrorCode.INVALID_INPUT, "등록된 문항이 없는 퀴즈는 응시할 수 없습니다.");
        }

        int nextAttemptNumber = quizAttemptRepository
                .findTopByQuizIdAndLearnerIdAndIsDeletedFalseOrderByAttemptNumberDesc(quizId, userId)
                .map(previous -> previous.getAttemptNumber() + 1)
                .orElse(1);

        int computedMaxScore = questions.stream()
                .mapToInt(question -> question.getPoints() == null ? 0 : question.getPoints())
                .sum();

        QuizAttempt attempt = QuizAttempt.builder()
                .quiz(quiz)
                .learner(learner)
                .score(0)
                .maxScore(computedMaxScore)
                .startedAt(LocalDateTime.now())
                .attemptNumber(nextAttemptNumber)
                .build();

        QuizAttempt savedAttempt = quizAttemptRepository.save(attempt);

        Map<Long, SubmitQuizAnswerRequest> answerRequestMap = buildAnswerRequestMap(request.getAnswers());
        int totalScore = 0;

        for (QuizQuestion question : questions) {
            SubmitQuizAnswerRequest answerRequest = answerRequestMap.get(question.getId());

            QuizAnswer quizAnswer = evaluateAndCreateAnswer(savedAttempt, question, answerRequest);
            quizAnswerRepository.save(quizAnswer);

            totalScore += quizAnswer.getPointsEarned() == null ? 0 : quizAnswer.getPointsEarned();
        }

        boolean passed = isPassed(totalScore, computedMaxScore);
        int timeSpentSeconds = request.getTimeSpentSeconds() == null ? 0 : request.getTimeSpentSeconds();

        savedAttempt.completeAttempt(totalScore, computedMaxScore, passed, timeSpentSeconds);

        return quizResultQueryService.getQuizAttemptResult(userId, savedAttempt.getId());
    }

    // 학습자 역할인지 검증하고 사용자 엔티티를 반환한다.
    private User getLearner(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        if (user.getRole() != UserRole.ROLE_LEARNER) {
            throw new CustomException(ErrorCode.FORBIDDEN, "학습자만 퀴즈를 응시할 수 있습니다.");
        }

        if (!Boolean.TRUE.equals(user.getIsActive())) {
            throw new CustomException(ErrorCode.FORBIDDEN, "비활성 사용자입니다.");
        }

        return user;
    }

    // 응시 가능한 공개 퀴즈인지 검증하고 엔티티를 반환한다.
    private Quiz getAvailableQuiz(Long quizId) {
        Quiz quiz = quizRepository.findByIdAndIsDeletedFalse(quizId)
                .orElseThrow(() -> new CustomException(ErrorCode.QUIZ_NOT_FOUND));

        if (!Boolean.TRUE.equals(quiz.getIsActive()) || !Boolean.TRUE.equals(quiz.getIsPublished())) {
            throw new CustomException(ErrorCode.FORBIDDEN, "응시 가능한 퀴즈가 아닙니다.");
        }

        return quiz;
    }

    // 문항별 답안 요청을 questionId 기준 map으로 변환한다.
    private Map<Long, SubmitQuizAnswerRequest> buildAnswerRequestMap(List<SubmitQuizAnswerRequest> answers) {
        Map<Long, SubmitQuizAnswerRequest> answerRequestMap = new HashMap<>();

        for (SubmitQuizAnswerRequest answer : answers) {
            answerRequestMap.put(answer.getQuestionId(), answer);
        }

        return answerRequestMap;
    }

    // 문항 유형에 맞춰 채점하고 QuizAnswer 엔티티를 생성한다.
    private QuizAnswer evaluateAndCreateAnswer(
            QuizAttempt savedAttempt,
            QuizQuestion question,
            SubmitQuizAnswerRequest answerRequest
    ) {
        List<QuizQuestionOption> options = quizQuestionOptionRepository
                .findAllByQuestionIdAndIsDeletedFalseOrderByDisplayOrderAsc(question.getId());

        if (question.getQuestionType() == QuestionType.SHORT_ANSWER) {
            return createShortAnswer(savedAttempt, question, answerRequest, options);
        }

        return createObjectiveAnswer(savedAttempt, question, answerRequest, options);
    }

    // 객관식 또는 OX 문항 채점을 수행한다.
    private QuizAnswer createObjectiveAnswer(
            QuizAttempt savedAttempt,
            QuizQuestion question,
            SubmitQuizAnswerRequest answerRequest,
            List<QuizQuestionOption> options
    ) {
        QuizQuestionOption selectedOption = null;
        boolean correct = false;
        int pointsEarned = 0;

        if (answerRequest != null && answerRequest.getSelectedOptionId() != null) {
            selectedOption = options.stream()
                    .filter(option -> Objects.equals(option.getId(), answerRequest.getSelectedOptionId()))
                    .findFirst()
                    .orElse(null);

            correct = selectedOption != null && Boolean.TRUE.equals(selectedOption.getIsCorrect());
            pointsEarned = correct ? question.getPoints() : 0;
        }

        return QuizAnswer.builder()
                .attempt(savedAttempt)
                .question(question)
                .selectedOption(selectedOption)
                .textAnswer(null)
                .isCorrect(correct)
                .pointsEarned(pointsEarned)
                .build();
    }

    // 주관식 문항 채점을 수행하며 현재 구조상 정답 optionText와 대소문자 무시 비교로 판정한다.
    private QuizAnswer createShortAnswer(
            QuizAttempt savedAttempt,
            QuizQuestion question,
            SubmitQuizAnswerRequest answerRequest,
            List<QuizQuestionOption> options
    ) {
        String submittedText = answerRequest == null ? null : answerRequest.getTextAnswer();

        List<String> correctAnswers = options.stream()
                .filter(option -> Boolean.TRUE.equals(option.getIsCorrect()))
                .map(QuizQuestionOption::getOptionText)
                .map(this::normalize)
                .toList();

        boolean correct = submittedText != null && correctAnswers.contains(normalize(submittedText));
        int pointsEarned = correct ? question.getPoints() : 0;

        return QuizAnswer.builder()
                .attempt(savedAttempt)
                .question(question)
                .selectedOption(null)
                .textAnswer(submittedText)
                .isCorrect(correct)
                .pointsEarned(pointsEarned)
                .build();
    }

    // 문자열 비교를 위한 정규화를 수행한다.
    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    // 현재는 60퍼센트 이상이면 통과로 간주한다.
    private boolean isPassed(int score, int maxScore) {
        if (maxScore <= 0) {
            return false;
        }

        return score >= Math.ceil(maxScore * 0.6);
    }
}
