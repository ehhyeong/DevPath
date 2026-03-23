package com.devpath.api.qna.service;

import com.devpath.api.qna.dto.AnswerResponse;
import com.devpath.api.qna.dto.QuestionCreateRequest;
import com.devpath.api.qna.dto.QuestionDetailResponse;
import com.devpath.api.qna.dto.QuestionSummaryResponse;
import com.devpath.api.qna.dto.QuestionTemplateResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
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

        List<AnswerResponse> answers = answerRepository.findAllByQuestionIdAndIsDeletedFalseOrderByCreatedAtAsc(questionId)
                .stream()
                .map(AnswerResponse::from)
                .toList();

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
}
