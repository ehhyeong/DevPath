package com.devpath.api.instructor.service;

import com.devpath.api.instructor.dto.qna.QnaAnswerRequest;
import com.devpath.api.instructor.dto.qna.QnaAnswerResponse;
import com.devpath.api.instructor.dto.qna.QnaDraftRequest;
import com.devpath.api.instructor.dto.qna.QnaDraftResponse;
import com.devpath.api.instructor.dto.qna.QnaInboxResponse;
import com.devpath.api.instructor.dto.qna.QnaStatusUpdateRequest;
import com.devpath.api.instructor.dto.qna.QnaTemplateRequest;
import com.devpath.api.instructor.dto.qna.QnaTemplateResponse;
import com.devpath.api.instructor.dto.qna.QnaTimelineResponse;
import com.devpath.api.instructor.entity.QnaAnswerDraft;
import com.devpath.api.instructor.entity.QnaTemplate;
import com.devpath.api.instructor.repository.QnaAnswerDraftRepository;
import com.devpath.api.instructor.repository.QnaTemplateRepository;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.qna.entity.Answer;
import com.devpath.domain.qna.entity.QnaStatus;
import com.devpath.domain.qna.entity.Question;
import com.devpath.domain.qna.repository.AnswerRepository;
import com.devpath.domain.qna.repository.QuestionRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
    public List<QnaInboxResponse> getInbox(Long instructorId, QnaStatus status) {
        List<Question> questions = (status != null)
                ? questionRepository.findAllByInstructorIdAndQnaStatusAndIsDeletedFalse(instructorId, status)
                : questionRepository.findAllByInstructorIdAndIsDeletedFalse(instructorId);

        return questions.stream()
                .map(QnaInboxResponse::from)
                .toList();
    }

    public void updateStatus(Long questionId, Long instructorId, QnaStatusUpdateRequest request) {
        Question question = getManagedQuestion(questionId, instructorId);
        boolean hasPublishedAnswer = answerRepository.findFirstByQuestionIdAndIsDeletedFalse(questionId).isPresent();

        // published answer 없이 ANSWERED로 바꾸는 상태 꼬임을 막는다.
        if (request.getStatus() == QnaStatus.ANSWERED && !hasPublishedAnswer) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }

        // published answer가 남아 있는데 UNANSWERED로 내리면 timeline과 실제 데이터가 어긋난다.
        if (request.getStatus() == QnaStatus.UNANSWERED && hasPublishedAnswer) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }

        question.updateQnaStatus(request.getStatus());
    }

    public QnaDraftResponse saveDraft(Long questionId, Long instructorId, QnaDraftRequest request) {
        getManagedQuestion(questionId, instructorId);

        QnaAnswerDraft draft = draftRepository
                .findByQuestionIdAndInstructorIdAndIsDeletedFalse(questionId, instructorId)
                .orElse(null);

        if (draft != null) {
            draft.updateDraft(request.getDraftContent());
        } else {
            draft = draftRepository.save(
                    QnaAnswerDraft.builder()
                            .questionId(questionId)
                            .instructorId(instructorId)
                            .draftContent(request.getDraftContent())
                            .build()
            );
        }

        return QnaDraftResponse.from(draft);
    }

    public QnaAnswerResponse createAnswer(Long questionId, Long instructorId, QnaAnswerRequest request) {
        Question question = getManagedQuestion(questionId, instructorId);

        // 운영 정책상 질문당 published answer는 1개만 허용하고, 이후 수정은 update API로 처리한다.
        if (answerRepository.findFirstByQuestionIdAndIsDeletedFalse(questionId).isPresent()) {
            throw new CustomException(ErrorCode.DUPLICATE_RESOURCE);
        }

        User instructor = userRepository.findById(instructorId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        Answer answer = Answer.builder()
                .question(question)
                .user(instructor)
                .content(request.getContent())
                .build();

        Answer saved = answerRepository.save(answer);

        draftRepository.findByQuestionIdAndInstructorIdAndIsDeletedFalse(questionId, instructorId)
                .ifPresent(QnaAnswerDraft::deleteDraft);

        question.markAsAnswered();

        return QnaAnswerResponse.from(saved);
    }

    public QnaAnswerResponse updateAnswer(Long questionId, Long answerId, Long instructorId, QnaAnswerRequest request) {
        getManagedQuestion(questionId, instructorId);

        Answer answer = answerRepository.findByQuestion_IdAndIdAndIsDeletedFalse(questionId, answerId)
                .orElseThrow(() -> new CustomException(ErrorCode.ANSWER_NOT_FOUND));

        if (!answer.getUser().getId().equals(instructorId)) {
            throw new CustomException(ErrorCode.UNAUTHORIZED_ACTION);
        }

        answer.updateContent(request.getContent());

        // published answer를 직접 수정한 뒤에는 오래된 draft를 남기지 않는다.
        draftRepository.findByQuestionIdAndInstructorIdAndIsDeletedFalse(questionId, instructorId)
                .ifPresent(QnaAnswerDraft::deleteDraft);

        return QnaAnswerResponse.from(answer);
    }

    @Transactional(readOnly = true)
    public QnaTimelineResponse getTimeline(Long questionId, Long instructorId) {
        Question question = getManagedQuestion(questionId, instructorId);

        QnaAnswerResponse publishedAnswer = answerRepository.findFirstByQuestionIdAndIsDeletedFalse(questionId)
                .map(QnaAnswerResponse::from)
                .orElse(null);

        QnaDraftResponse draft = draftRepository
                .findByQuestionIdAndInstructorIdAndIsDeletedFalse(questionId, instructorId)
                .map(QnaDraftResponse::from)
                .orElse(null);

        return QnaTimelineResponse.builder()
                .question(QnaInboxResponse.from(question))
                .publishedAnswer(publishedAnswer)
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
                .stream()
                .map(QnaTemplateResponse::from)
                .toList();
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

    // 질문이 존재하더라도 담당 강사 강의 소속이 아니면 접근을 막는다.
    private Question getManagedQuestion(Long questionId, Long instructorId) {
        return questionRepository.findManagedQuestionByInstructorId(questionId, instructorId)
                .orElseGet(() -> {
                    if (questionRepository.findByIdAndIsDeletedFalse(questionId).isPresent()) {
                        throw new CustomException(ErrorCode.UNAUTHORIZED_ACTION);
                    }

                    throw new CustomException(ErrorCode.QUESTION_NOT_FOUND);
                });
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
