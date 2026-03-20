package com.devpath.api.evaluation.service;

import com.devpath.api.evaluation.dto.request.SaveWrongAnswerNoteRequest;
import com.devpath.api.evaluation.dto.response.WrongAnswerNoteResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.learning.entity.QuizAnswer;
import com.devpath.domain.learning.entity.QuizAttempt;
import com.devpath.domain.learning.entity.QuizQuestion;
import com.devpath.domain.learning.entity.WrongAnswerNote;
import com.devpath.domain.learning.repository.QuizAnswerRepository;
import com.devpath.domain.learning.repository.QuizAttemptRepository;
import com.devpath.domain.learning.repository.QuizQuestionRepository;
import com.devpath.domain.learning.repository.WrongAnswerNoteRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.entity.UserRole;
import com.devpath.domain.user.repository.UserRepository;
import java.util.List;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class WrongAnswerNoteService {

    private final UserRepository userRepository;
    private final QuizAttemptRepository quizAttemptRepository;
    private final QuizQuestionRepository quizQuestionRepository;
    private final QuizAnswerRepository quizAnswerRepository;
    private final WrongAnswerNoteRepository wrongAnswerNoteRepository;

    // 학습자의 오답 노트를 저장한다.
    public WrongAnswerNoteResponse saveWrongAnswerNote(Long userId, Long attemptId, SaveWrongAnswerNoteRequest request) {
        User learner = getLearner(userId);

        QuizAttempt attempt = quizAttemptRepository.findByIdAndIsDeletedFalse(attemptId)
                .orElseThrow(() -> new CustomException(ErrorCode.RESOURCE_NOT_FOUND, "퀴즈 응시 기록을 찾을 수 없습니다."));

        if (!Objects.equals(attempt.getLearner().getId(), userId)) {
            throw new CustomException(ErrorCode.FORBIDDEN, "본인의 응시에 대해서만 오답 노트를 저장할 수 있습니다.");
        }

        QuizQuestion question = quizQuestionRepository.findByIdAndIsDeletedFalse(request.getQuestionId())
                .orElseThrow(() -> new CustomException(ErrorCode.RESOURCE_NOT_FOUND, "문항을 찾을 수 없습니다."));

        QuizAnswer quizAnswer = getAttemptAnswer(attemptId, question.getId());

        // 오답인 경우에만 오답 노트 저장을 허용한다.
        if (Boolean.TRUE.equals(quizAnswer.getIsCorrect())) {
            throw new CustomException(ErrorCode.INVALID_INPUT, "정답 문항은 오답 노트로 저장할 수 없습니다.");
        }

        WrongAnswerNote wrongAnswerNote = WrongAnswerNote.builder()
                .learner(learner)
                .attempt(attempt)
                .question(question)
                .noteContent(request.getNoteContent())
                .build();

        WrongAnswerNote saved = wrongAnswerNoteRepository.save(wrongAnswerNote);
        return WrongAnswerNoteResponse.from(saved);
    }

    // 학습자 역할인지 검증하고 사용자 엔티티를 반환한다.
    private User getLearner(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        if (user.getRole() != UserRole.ROLE_LEARNER) {
            throw new CustomException(ErrorCode.FORBIDDEN, "학습자만 오답 노트를 저장할 수 있습니다.");
        }

        return user;
    }

    // 특정 응시의 특정 문항 답안을 조회한다.
    private QuizAnswer getAttemptAnswer(Long attemptId, Long questionId) {
        List<QuizAnswer> answers = quizAnswerRepository.findAllByAttemptIdAndIsDeletedFalseOrderByIdAsc(attemptId);

        return answers.stream()
                .filter(answer -> Objects.equals(answer.getQuestion().getId(), questionId))
                .findFirst()
                .orElseThrow(() -> new CustomException(ErrorCode.RESOURCE_NOT_FOUND, "해당 응시의 문항 답안을 찾을 수 없습니다."));
    }
}
