package com.devpath.api.evaluation.service;

import com.devpath.api.evaluation.dto.response.QuizAttemptResultResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.learning.entity.QuestionType;
import com.devpath.domain.learning.entity.Quiz;
import com.devpath.domain.learning.entity.QuizAnswer;
import com.devpath.domain.learning.entity.QuizAttempt;
import com.devpath.domain.learning.entity.QuizQuestionOption;
import com.devpath.domain.learning.repository.QuizAnswerRepository;
import com.devpath.domain.learning.repository.QuizAttemptRepository;
import com.devpath.domain.learning.repository.QuizQuestionOptionRepository;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class QuizResultQueryService {

    private final QuizAttemptRepository quizAttemptRepository;
    private final QuizAnswerRepository quizAnswerRepository;
    private final QuizQuestionOptionRepository quizQuestionOptionRepository;

    // 특정 학습자의 특정 응시 결과를 조회한다.
    public QuizAttemptResultResponse getQuizAttemptResult(Long userId, Long attemptId) {
        QuizAttempt attempt = quizAttemptRepository.findByIdAndIsDeletedFalse(attemptId)
                .orElseThrow(() -> new CustomException(ErrorCode.RESOURCE_NOT_FOUND, "퀴즈 응시 결과를 찾을 수 없습니다."));

        // 본인 응시 결과만 조회 가능하도록 소유권을 검증한다.
        if (!Objects.equals(attempt.getLearner().getId(), userId)) {
            throw new CustomException(ErrorCode.FORBIDDEN, "본인의 퀴즈 결과만 조회할 수 있습니다.");
        }

        Quiz quiz = attempt.getQuiz();

        List<QuizAttemptResultResponse.QuestionResult> questionResults = quizAnswerRepository
                .findAllByAttemptIdAndIsDeletedFalseOrderByIdAsc(attemptId)
                .stream()
                .map(answer -> toQuestionResult(quiz, answer))
                .toList();

        return QuizAttemptResultResponse.builder()
                .attemptId(attempt.getId())
                .quizId(quiz.getId())
                .quizTitle(quiz.getTitle())
                .score(attempt.getScore())
                .maxScore(attempt.getMaxScore())
                .passed(attempt.getIsPassed())
                .attemptNumber(attempt.getAttemptNumber())
                .completedAt(attempt.getCompletedAt())
                .questionResults(questionResults)
                .build();
    }

    // 답안 엔티티를 문항별 결과 DTO로 변환한다.
    private QuizAttemptResultResponse.QuestionResult toQuestionResult(Quiz quiz, QuizAnswer answer) {
        String correctAnswerText = null;
        String explanation = null;

        // 정답 공개 정책이 켜져 있으면 문항의 정답 텍스트를 내려준다.
        if (Boolean.TRUE.equals(quiz.getExposeAnswer())) {
            correctAnswerText = getCorrectAnswerText(answer.getQuestion().getId(), answer.getQuestion().getQuestionType());
        }

        // 해설 공개 정책이 켜져 있으면 해설을 내려준다.
        if (Boolean.TRUE.equals(quiz.getExposeExplanation())) {
            explanation = answer.getQuestion().getExplanation();
        }

        return QuizAttemptResultResponse.QuestionResult.builder()
                .questionId(answer.getQuestion().getId())
                .questionType(answer.getQuestion().getQuestionType())
                .questionText(answer.getQuestion().getQuestionText())
                .correct(answer.getIsCorrect())
                .earnedPoints(answer.getPointsEarned())
                .selectedOptionId(answer.getSelectedOption() == null ? null : answer.getSelectedOption().getId())
                .selectedOptionText(answer.getSelectedOption() == null ? null : answer.getSelectedOption().getOptionText())
                .textAnswer(answer.getTextAnswer())
                .correctAnswerText(correctAnswerText)
                .explanation(explanation)
                .build();
    }

    // 현재 설계에서는 객관식과 주관식 모두 정답 optionText를 기준으로 정답 텍스트를 구성한다.
    private String getCorrectAnswerText(Long questionId, QuestionType questionType) {
        List<QuizQuestionOption> correctOptions = quizQuestionOptionRepository
                .findAllByQuestionIdAndIsDeletedFalseOrderByDisplayOrderAsc(questionId)
                .stream()
                .filter(option -> Boolean.TRUE.equals(option.getIsCorrect()))
                .toList();

        if (correctOptions.isEmpty()) {
            return null;
        }

        // 주관식도 현재 구조상 정답 optionText를 정답 텍스트로 사용한다.
        if (questionType == QuestionType.SHORT_ANSWER) {
            return correctOptions.stream()
                    .map(QuizQuestionOption::getOptionText)
                    .collect(Collectors.joining(", "));
        }

        return correctOptions.stream()
                .map(QuizQuestionOption::getOptionText)
                .collect(Collectors.joining(", "));
    }
}
