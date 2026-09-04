package com.devpath.api.qna.service;

import com.devpath.api.qna.dto.AnswerResponse;
import com.devpath.api.qna.dto.QuestionCreateRequest;
import com.devpath.api.qna.dto.QuestionDetailResponse;
import com.devpath.api.qna.dto.QuestionSummaryResponse;
import com.devpath.api.qna.dto.QuestionTemplateResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.course.entity.Lesson;
import com.devpath.domain.course.repository.CourseRepository;
import com.devpath.domain.course.repository.LessonRepository;
import com.devpath.domain.notification.service.InstructorNotificationPublisher;
import com.devpath.domain.qna.entity.Question;
import com.devpath.domain.qna.entity.QuestionTemplateType;
import com.devpath.domain.qna.repository.AnswerRepository;
import com.devpath.domain.qna.repository.QuestionRepository;
import com.devpath.domain.qna.repository.QuestionTemplateRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class QnaQuestionService {

  private final QuestionRepository questionRepository;
  private final AnswerRepository answerRepository;
  private final QuestionTemplateRepository questionTemplateRepository;
  private final UserRepository userRepository;
  private final LessonRepository lessonRepository;
  private final CourseRepository courseRepository;
  private final InstructorNotificationPublisher instructorNotificationPublisher;

  @Transactional
  public QuestionDetailResponse createQuestion(Long userId, QuestionCreateRequest request) {
    User user = getUser(userId);

    // 활성화된 템플릿 타입만 질문 작성에 사용할 수 있게 제한한다.
    validateTemplateType(request.getTemplateType());
    validateLessonContext(request.getCourseId(), request.getLessonId());

    Question question =
        Question.builder()
            .user(user)
            .templateType(request.getTemplateType())
            .difficulty(request.getDifficulty())
            .title(request.getTitle())
            .content(request.getContent())
            .courseId(request.getCourseId())
            .lessonId(request.getLessonId())
            .lectureTimestamp(request.getLectureTimestamp())
            .build();

    Question savedQuestion = questionRepository.save(question);
    notifyInstructorAboutQuestion(savedQuestion);
    return QuestionDetailResponse.from(savedQuestion, List.of());
  }

  public List<QuestionSummaryResponse> getQuestions(Long userId, Long courseId) {
    List<Question> questions =
        courseId == null
            ? questionRepository.findAllByUser_IdAndIsDeletedFalseOrderByCreatedAtDesc(userId)
            : questionRepository.findAllByCourseIdAndUser_IdAndIsDeletedFalseOrderByCreatedAtDesc(
                courseId, userId);

    Map<Long, Integer> answerCounts = buildAnswerCountMap(questions);

    return questions.stream()
        .map(
            question ->
                QuestionSummaryResponse.from(
                    question, answerCounts.getOrDefault(question.getId(), 0)))
        .toList();
  }

  @Transactional
  public QuestionDetailResponse getQuestionDetail(Long questionId) {
    Question question = getActiveQuestion(questionId);
    question.incrementViewCount();

    List<AnswerResponse> answers = getAnswerResponses(questionId);
    return QuestionDetailResponse.from(question, answers);
  }

  @Transactional
  public QuestionDetailResponse getQuestionDetail(Long userId, Long questionId) {
    Question question =
        questionRepository
            .findByIdAndUser_IdAndIsDeletedFalse(questionId, userId)
            .orElseThrow(() -> new CustomException(ErrorCode.QUESTION_NOT_FOUND));

    // 질문 상세 조회 시 조회수를 증가시킨다.
    question.incrementViewCount();

    List<AnswerResponse> answers = getAnswerResponses(questionId);
    return QuestionDetailResponse.from(question, answers);
  }

  public List<QuestionTemplateResponse> getQuestionTemplates() {
    return questionTemplateRepository.findAllByIsActiveTrueOrderBySortOrderAscIdAsc().stream()
        .map(QuestionTemplateResponse::from)
        .toList();
  }

  private void notifyInstructorAboutQuestion(Question question) {
    Long courseId = question.getCourseId();
    if (courseId == null) {
      return;
    }

    courseRepository
        .findById(courseId)
        .ifPresent(
            course ->
                instructorNotificationPublisher.notifyQna(
                    course.getInstructorId(), question.getTitle()));
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
    return answerRepository
        .findAllByQuestionIdAndIsDeletedFalseOrderByCreatedAtAsc(questionId)
        .stream()
        .map(AnswerResponse::from)
        .toList();
  }

  private Map<Long, Integer> buildAnswerCountMap(List<Question> questions) {
    if (questions.isEmpty()) {
      return Collections.emptyMap();
    }

    List<Long> questionIds = questions.stream().map(Question::getId).toList();

    return answerRepository.findAllByQuestionIdInAndIsDeletedFalse(questionIds).stream()
        .collect(
            Collectors.groupingBy(
                answer -> answer.getQuestion().getId(),
                Collectors.collectingAndThen(Collectors.counting(), Long::intValue)));
  }

  // 사용자 존재 여부를 공통으로 검증한다.
  private User getUser(Long userId) {
    return userRepository
        .findById(userId)
        .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
  }

  private void validateLessonContext(Long courseId, Long lessonId) {
    if (lessonId == null) {
      return;
    }

    Lesson lesson =
        lessonRepository
            .findById(lessonId)
            .orElseThrow(() -> new CustomException(ErrorCode.LESSON_NOT_FOUND));

    if (courseId != null && !lesson.getSection().getCourse().getCourseId().equals(courseId)) {
      throw new CustomException(ErrorCode.INVALID_INPUT, "질문 레슨이 강의에 속하지 않습니다.");
    }
  }

  // 삭제되지 않은 질문만 조회 대상으로 허용한다.
  private Question getActiveQuestion(Long questionId) {
    return questionRepository
        .findByIdAndIsDeletedFalse(questionId)
        .orElseThrow(() -> new CustomException(ErrorCode.QUESTION_NOT_FOUND));
  }
}
