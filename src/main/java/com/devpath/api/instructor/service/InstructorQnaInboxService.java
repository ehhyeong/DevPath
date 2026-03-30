package com.devpath.api.instructor.service;

import com.devpath.api.instructor.dto.qna.*;
import com.devpath.api.instructor.entity.QnaAnswerDraft;
import com.devpath.api.instructor.entity.QnaTemplate;
import com.devpath.api.instructor.repository.QnaAnswerDraftRepository;
import com.devpath.api.instructor.repository.QnaTemplateRepository;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.qna.entity.Answer;
import com.devpath.domain.qna.entity.Question;
import com.devpath.domain.qna.repository.AnswerRepository;
import com.devpath.domain.qna.repository.QuestionRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class InstructorQnaInboxService {

    private final QuestionRepository questionRepository;
    private final AnswerRepository answerRepository;
    private final UserRepository userRepository;
    private final QnaAnswerDraftRepository draftRepository;
    private final QnaTemplateRepository templateRepository;

    @Transactional(readOnly = true)
    public List<QnaInboxResponse> getInbox(Long instructorId, String status) {
        List<Question> questions = (status != null && !status.isBlank())
                ? questionRepository.findAllByInstructorIdAndQnaStatusAndIsDeletedFalse(instructorId, status)
                : questionRepository.findAllByInstructorIdAndIsDeletedFalse(instructorId);
        return questions.stream().map(QnaInboxResponse::from).collect(Collectors.toList());
    }

    public void updateStatus(Long questionId, QnaStatusUpdateRequest request) {
        Question question = getActiveQuestion(questionId);
        question.updateQnaStatus(request.getStatus());
    }

    public QnaDraftResponse saveDraft(Long questionId, Long instructorId, QnaDraftRequest request) {
        QnaAnswerDraft draft = draftRepository
                .findByQuestionIdAndInstructorIdAndIsDeletedFalse(questionId, instructorId)
                .orElse(null);
        if (draft != null) {
            draft.updateDraft(request.getDraftContent());
        } else {
            draft = draftRepository.save(QnaAnswerDraft.builder()
                    .questionId(questionId)
                    .instructorId(instructorId)
                    .draftContent(request.getDraftContent())
                    .build());
        }
        return QnaDraftResponse.from(draft);
    }

    public QnaAnswerResponse createAnswer(Long questionId, Long instructorId, QnaAnswerRequest request) {
        Question question = getActiveQuestion(questionId);
        User instructor = userRepository.findById(instructorId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
        Answer answer = Answer.builder()
                .question(question)
                .user(instructor)
                .content(request.getContent())
                .build();
        QnaAnswerResponse response = QnaAnswerResponse.from(answerRepository.save(answer));
        question.markAsAnswered();
        return response;
    }

    public QnaAnswerResponse updateAnswer(Long questionId, Long answerId, Long instructorId, QnaAnswerRequest request) {
        Answer answer = answerRepository.findByQuestion_IdAndIdAndIsDeletedFalse(questionId, answerId)
                .orElseThrow(() -> new CustomException(ErrorCode.ANSWER_NOT_FOUND));
        if (!answer.getUser().getId().equals(instructorId)) {
            throw new CustomException(ErrorCode.UNAUTHORIZED_ACTION);
        }
        answer.updateContent(request.getContent());
        return QnaAnswerResponse.from(answer);
    }

    @Transactional(readOnly = true)
    public QnaTimelineResponse getTimeline(Long questionId, Long instructorId) {
        Question question = getActiveQuestion(questionId);
        List<QnaAnswerResponse> answers = answerRepository
                .findAllByQuestionIdAndIsDeletedFalseOrderByCreatedAtAsc(questionId)
                .stream().map(QnaAnswerResponse::from).collect(Collectors.toList());
        QnaDraftResponse draft = draftRepository
                .findByQuestionIdAndInstructorIdAndIsDeletedFalse(questionId, instructorId)
                .map(QnaDraftResponse::from).orElse(null);

        return QnaTimelineResponse.builder()
                .question(QnaInboxResponse.from(question))
                .answers(answers)
                .draft(draft)
                .lectureTitle(question.getTitle())
                .lectureTimestamp(question.getLectureTimestamp())
                .build();
    }

    public QnaTemplateResponse createTemplate(Long instructorId, QnaTemplateRequest request) {
        QnaTemplate template = QnaTemplate.builder()
                .instructorId(instructorId)
                .title(request.getTitle())
                .content(request.getContent())
                .build();
        return QnaTemplateResponse.from(templateRepository.save(template));
    }

    @Transactional(readOnly = true)
    public List<QnaTemplateResponse> getTemplates(Long instructorId) {
        return templateRepository.findByInstructorIdAndIsDeletedFalse(instructorId)
                .stream().map(QnaTemplateResponse::from).collect(Collectors.toList());
    }

    public QnaTemplateResponse updateTemplate(Long templateId, Long instructorId, QnaTemplateRequest request) {
        QnaTemplate template = getActiveTemplate(templateId, instructorId);
        template.update(request.getTitle(), request.getContent());
        return QnaTemplateResponse.from(template);
    }

    public void deleteTemplate(Long templateId, Long instructorId) {
        QnaTemplate template = getActiveTemplate(templateId, instructorId);
        template.delete();
    }

    private Question getActiveQuestion(Long questionId) {
        return questionRepository.findByIdAndIsDeletedFalse(questionId)
                .orElseThrow(() -> new CustomException(ErrorCode.QUESTION_NOT_FOUND));
    }

    private QnaTemplate getActiveTemplate(Long templateId, Long instructorId) {
        QnaTemplate template = templateRepository.findByIdAndIsDeletedFalse(templateId)
                .orElseThrow(() -> new CustomException(ErrorCode.RESOURCE_NOT_FOUND));
        if (!template.getInstructorId().equals(instructorId)) {
            throw new CustomException(ErrorCode.UNAUTHORIZED_ACTION);
        }
        return template;
    }
}