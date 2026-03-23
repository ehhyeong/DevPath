package com.devpath.api.qna.service;

import com.devpath.api.qna.dto.AnswerCreateRequest;
import com.devpath.api.qna.dto.AnswerResponse;
import com.devpath.api.qna.dto.QuestionCreateRequest;
import com.devpath.api.qna.dto.QuestionDetailResponse;
import com.devpath.api.qna.dto.QuestionSummaryResponse;
import com.devpath.api.qna.dto.QuestionTemplateResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.qna.entity.Answer;
import com.devpath.domain.qna.entity.Question;
import com.devpath.domain.qna.entity.QuestionTemplateType;
import com.devpath.domain.qna.repository.AnswerRepository;
import com.devpath.domain.qna.repository.QuestionRepository;
import com.devpath.domain.qna.repository.QuestionTemplateRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class QnaService {

    private final QuestionRepository questionRepository;
    private final AnswerRepository answerRepository;
    private final QuestionTemplateRepository questionTemplateRepository;
    private final UserRepository userRepository;

    @Transactional
    public QuestionDetailResponse createQuestion(Long userId, QuestionCreateRequest request) {
        User user = getUser(userId);

        // 활성화된 템플릿 타입만 질문 작성에 사용할 수 있게 제한한다.
        validateTemplateType(request.getTemplateType());

        Question question = Question.builder()
                .user(user)
                .templateType(request.getTemplateType())
                .difficulty(request.getDifficulty())
                .title(request.getTitle())
                .content(request.getContent())
                .build();

        Question savedQuestion = questionRepository.save(question);
        return QuestionDetailResponse.from(savedQuestion, List.of());
    }

    public List<QuestionSummaryResponse> getQuestions() {
        return questionRepository.findAllByIsDeletedFalseOrderByCreatedAtDesc()
                .stream()
                .map(QuestionSummaryResponse::from)
                .toList();
    }

    @Transactional
    public QuestionDetailResponse getQuestionDetail(Long questionId) {
        Question question = getActiveQuestion(questionId);

        // 질문 상세 조회 시 조회수를 증가시킨다.
        question.incrementViewCount();

        List<AnswerResponse> answers = getAnswerResponses(questionId);
        return QuestionDetailResponse.from(question, answers);
    }

    @Transactional
    public AnswerResponse createAnswer(Long userId, Long questionId, AnswerCreateRequest request) {
        User user = getUser(userId);
        Question question = getActiveQuestion(questionId);

        Answer answer = Answer.builder()
                .question(question)
                .user(user)
                .content(request.getContent())
                .build();

        Answer savedAnswer = answerRepository.save(answer);
        return AnswerResponse.from(savedAnswer);
    }

    @Transactional
    public QuestionDetailResponse adoptAnswer(Long userId, Long questionId, Long answerId) {
        Question question = getActiveQuestion(questionId);

        // 질문 작성자 본인만 답변을 채택할 수 있다.
        validateQuestionOwner(userId, question);

        // 이미 채택된 답변이 있으면 중복 채택을 막는다.
        if (question.hasAdoptedAnswer()) {
            throw new CustomException(ErrorCode.ALREADY_ADOPTED);
        }

        Answer answer = answerRepository.findByQuestion_IdAndIdAndIsDeletedFalse(questionId, answerId)
                .orElseThrow(() -> new CustomException(ErrorCode.ANSWER_NOT_FOUND));

        // 자신의 답변은 채택할 수 없다.
        if (answer.getUser().getId().equals(userId)) {
            throw new CustomException(ErrorCode.CANNOT_ADOPT_OWN_ANSWER);
        }

        // 질문과 답변의 채택 상태를 함께 변경한다.
        answer.adopt();
        question.adoptAnswer(answer.getId());

        List<AnswerResponse> answers = getAnswerResponses(questionId);
        return QuestionDetailResponse.from(question, answers);
    }

    public List<QuestionTemplateResponse> getQuestionTemplates() {
        return questionTemplateRepository.findAllByIsActiveTrueOrderBySortOrderAscIdAsc()
                .stream()
                .map(QuestionTemplateResponse::from)
                .toList();
    }

    // 활성화된 템플릿 타입인지 검증한다.
    private void validateTemplateType(QuestionTemplateType templateType) {
        boolean exists = questionTemplateRepository.existsByTemplateTypeAndIsActiveTrue(templateType);
        if (!exists) {
            throw new CustomException(ErrorCode.INVALID_INPUT, "활성화되지 않은 질문 템플릿 타입입니다.");
        }
    }

    // 특정 질문의 답변 목록을 응답 DTO로 변환한다.
    private List<AnswerResponse> getAnswerResponses(Long questionId) {
        return answerRepository.findAllByQuestionIdAndIsDeletedFalseOrderByCreatedAtAsc(questionId)
                .stream()
                .map(AnswerResponse::from)
                .toList();
    }

    // 사용자 존재 여부를 공통으로 검증한다.
    private User getUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
    }

    // 삭제되지 않은 질문만 조회 대상으로 허용한다.
    private Question getActiveQuestion(Long questionId) {
        return questionRepository.findByIdAndIsDeletedFalse(questionId)
                .orElseThrow(() -> new CustomException(ErrorCode.QUESTION_NOT_FOUND));
    }

    // 질문 작성자 본인만 채택할 수 있도록 검증한다.
    private void validateQuestionOwner(Long userId, Question question) {
        if (!question.getUser().getId().equals(userId)) {
            throw new CustomException(ErrorCode.UNAUTHORIZED_ACTION);
        }
    }
}
