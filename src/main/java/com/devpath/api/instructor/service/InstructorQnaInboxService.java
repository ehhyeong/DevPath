package com.devpath.api.instructor.service;

import com.devpath.api.notification.service.NotificationEventService;
import com.devpath.api.qna.realtime.QnaRealtimePublisher;
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
import com.devpath.api.notification.service.NotificationEventService;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.course.entity.Course;
import com.devpath.domain.course.entity.Lesson;
import com.devpath.domain.course.entity.LessonType;
import com.devpath.domain.course.repository.CourseRepository;
import com.devpath.domain.course.repository.LessonRepository;
import com.devpath.domain.qna.entity.Answer;
import com.devpath.domain.qna.entity.QnaStatus;
import com.devpath.domain.qna.entity.Question;
import com.devpath.domain.qna.repository.AnswerRepository;
import com.devpath.domain.qna.repository.QuestionRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.entity.UserProfile;
import com.devpath.domain.user.repository.UserProfileRepository;
import com.devpath.domain.user.repository.UserRepository;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
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
  private final UserProfileRepository userProfileRepository;
  private final CourseRepository courseRepository;
  private final NotificationEventService notificationEventService;
  private final LessonRepository lessonRepository;
  private final QnaAnswerDraftRepository draftRepository;
  private final QnaTemplateRepository templateRepository;
  private final QnaRealtimePublisher qnaRealtimePublisher;

  @Transactional(readOnly = true)
  public List<QnaInboxResponse> getInbox(Long instructorId, QnaStatus status) {
    List<Question> questions;
    if (status == QnaStatus.UNANSWERED) {
      questions = questionRepository.findAllUnansweredByInstructorId(instructorId);
    } else if (status == QnaStatus.ANSWERED) {
      questions = questionRepository.findAllAnsweredByInstructorId(instructorId);
    } else {
      questions = questionRepository.findAllByInstructorIdAndIsDeletedFalse(instructorId);
    }

    Map<Long, String> courseTitles = resolveCourseTitles(questions);
    Map<Long, Lesson> lessonsByQuestionId = resolveLessonsByQuestionId(questions);
    Map<Long, QnaStatus> statusesByQuestionId = resolveStatuses(questions);
    Map<Long, String> learnerProfileImages = resolveProfileImages(questions);

    return questions.stream()
        .map(
            question -> {
              Long learnerId = question.getUser() == null ? null : question.getUser().getId();
              Lesson lesson = lessonsByQuestionId.get(question.getId());
              return QnaInboxResponse.from(
                  question,
                  courseTitles.get(question.getCourseId()),
                  lesson == null ? question.getLessonId() : lesson.getLessonId(),
                  lesson == null ? null : lesson.getTitle(),
                  statusesByQuestionId.getOrDefault(question.getId(), QnaStatus.UNANSWERED),
                  learnerId == null ? null : learnerProfileImages.get(learnerId));
            })
        .toList();
  }

  public void updateStatus(Long questionId, Long instructorId, QnaStatusUpdateRequest request) {
    Question question = getManagedQuestion(questionId, instructorId);
    boolean hasPublishedAnswer =
        answerRepository.findFirstByQuestionIdAndIsDeletedFalse(questionId).isPresent();

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

    QnaAnswerDraft draft =
        draftRepository
            .findByQuestionIdAndInstructorIdAndIsDeletedFalse(questionId, instructorId)
            .orElse(null);

    if (draft != null) {
      draft.updateDraft(request.getDraftContent());
    } else {
      draft =
          draftRepository.save(
              QnaAnswerDraft.builder()
                  .questionId(questionId)
                  .instructorId(instructorId)
                  .draftContent(request.getDraftContent())
                  .build());
    }

    return QnaDraftResponse.from(draft);
  }

  public QnaAnswerResponse createAnswer(
      Long questionId, Long instructorId, QnaAnswerRequest request) {
    Question question = getManagedQuestion(questionId, instructorId);

    // 운영 정책상 질문당 published answer는 1개만 허용하고, 이후 수정은 update API로 처리한다.
    if (answerRepository.findFirstByQuestionIdAndIsDeletedFalse(questionId).isPresent()) {
      throw new CustomException(ErrorCode.DUPLICATE_RESOURCE);
    }

    User instructor =
        userRepository
            .findById(instructorId)
            .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

    Answer answer =
        Answer.builder().question(question).user(instructor).content(request.getContent()).build();

    Answer saved = answerRepository.save(answer);

    draftRepository
        .findByQuestionIdAndInstructorIdAndIsDeletedFalse(questionId, instructorId)
        .ifPresent(QnaAnswerDraft::deleteDraft);

    question.markAsAnswered();
    qnaRealtimePublisher.answerCreated(question, saved.getId());

    notificationEventService.notifySystem(
        question.getUser().getId(), "QnA 질문에 답변이 등록되었습니다: " + question.getTitle());

    return QnaAnswerResponse.from(
        saved,
        getInstructorDisplayName(saved.getUser().getId()),
        getInstructorProfileImage(saved.getUser().getId()));
  }

  public QnaAnswerResponse updateAnswer(
      Long questionId, Long answerId, Long instructorId, QnaAnswerRequest request) {
    Question question = getManagedQuestion(questionId, instructorId);

    Answer answer =
        answerRepository
            .findByQuestion_IdAndIdAndIsDeletedFalse(questionId, answerId)
            .orElseThrow(() -> new CustomException(ErrorCode.ANSWER_NOT_FOUND));

    if (!answer.getUser().getId().equals(instructorId)) {
      throw new CustomException(ErrorCode.UNAUTHORIZED_ACTION);
    }

    answer.updateContent(request.getContent());
    qnaRealtimePublisher.answerUpdated(question, answer.getId());

    // published answer를 직접 수정한 뒤에는 오래된 draft를 남기지 않는다.
    draftRepository
        .findByQuestionIdAndInstructorIdAndIsDeletedFalse(questionId, instructorId)
        .ifPresent(QnaAnswerDraft::deleteDraft);

    return QnaAnswerResponse.from(
        answer,
        getInstructorDisplayName(answer.getUser().getId()),
        getInstructorProfileImage(answer.getUser().getId()));
  }

  @Transactional(readOnly = true)
  public QnaTimelineResponse getTimeline(Long questionId, Long instructorId) {
    Question question = getManagedQuestion(questionId, instructorId);
    Lesson lesson = resolveLesson(question);
    String lessonTitle = lesson == null ? null : lesson.getTitle();

    QnaAnswerResponse publishedAnswer =
        answerRepository
            .findFirstByQuestionIdAndIsDeletedFalse(questionId)
            .map(
                answer ->
                    QnaAnswerResponse.from(
                        answer,
                        getInstructorDisplayName(answer.getUser().getId()),
                        getInstructorProfileImage(answer.getUser().getId())))
            .orElse(null);

    QnaDraftResponse draft =
        draftRepository
            .findByQuestionIdAndInstructorIdAndIsDeletedFalse(questionId, instructorId)
            .map(QnaDraftResponse::from)
            .orElse(null);

    return new QnaTimelineResponse(
        QnaInboxResponse.from(
            question,
            resolveCourseTitle(question.getCourseId()),
            lesson == null ? question.getLessonId() : lesson.getLessonId(),
            lessonTitle,
            publishedAnswer == null ? QnaStatus.UNANSWERED : QnaStatus.ANSWERED,
            getProfileImage(question.getUser() == null ? null : question.getUser().getId())),
        publishedAnswer,
        draft,
        lessonTitle,
        question.getLectureTimestamp());
  }

  public QnaTemplateResponse createTemplate(Long instructorId, QnaTemplateRequest request) {
    QnaTemplate template =
        QnaTemplate.builder()
            .instructorId(instructorId)
            .title(request.getTitle())
            .content(request.getContent())
            .build();

    return QnaTemplateResponse.from(templateRepository.save(template));
  }

  @Transactional(readOnly = true)
  public List<QnaTemplateResponse> getTemplates(Long instructorId) {
    return templateRepository.findByInstructorIdAndIsDeletedFalse(instructorId).stream()
        .map(QnaTemplateResponse::from)
        .toList();
  }

  public QnaTemplateResponse updateTemplate(
      Long templateId, Long instructorId, QnaTemplateRequest request) {
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
    return questionRepository
        .findManagedQuestionByInstructorId(questionId, instructorId)
        .orElseGet(
            () -> {
              if (questionRepository.findByIdAndIsDeletedFalse(questionId).isPresent()) {
                throw new CustomException(ErrorCode.UNAUTHORIZED_ACTION);
              }

              throw new CustomException(ErrorCode.QUESTION_NOT_FOUND);
            });
  }

  private QnaTemplate getActiveTemplate(Long templateId, Long instructorId) {
    QnaTemplate template =
        templateRepository
            .findByIdAndIsDeletedFalse(templateId)
            .orElseThrow(() -> new CustomException(ErrorCode.RESOURCE_NOT_FOUND));

    if (!template.getInstructorId().equals(instructorId)) {
      throw new CustomException(ErrorCode.UNAUTHORIZED_ACTION);
    }

    return template;
  }

  private Map<Long, String> resolveCourseTitles(List<Question> questions) {
    List<Long> courseIds =
        questions.stream()
            .map(Question::getCourseId)
            .filter(courseId -> courseId != null)
            .distinct()
            .toList();

    if (courseIds.isEmpty()) {
      return Map.of();
    }

    return courseRepository.findAllById(courseIds).stream()
        .collect(Collectors.toMap(Course::getCourseId, Course::getTitle, (left, right) -> left));
  }

  private String resolveCourseTitle(Long courseId) {
    if (courseId == null) {
      return null;
    }

    return courseRepository.findById(courseId).map(Course::getTitle).orElse(null);
  }

  private Map<Long, Lesson> resolveLessonsByQuestionId(List<Question> questions) {
    List<Long> lessonIds =
        questions.stream()
            .map(Question::getLessonId)
            .filter(lessonId -> lessonId != null)
            .distinct()
            .toList();

    Map<Long, Lesson> lessonsById =
        lessonIds.isEmpty()
            ? Map.of()
            : lessonRepository.findAllById(lessonIds).stream()
                .collect(
                    Collectors.toMap(Lesson::getLessonId, lesson -> lesson, (left, right) -> left));

    Map<Long, Lesson> firstVideoLessonsByCourseId = resolveFirstVideoLessonsByCourseId(questions);
    Map<Long, Lesson> result = new HashMap<>();

    for (Question question : questions) {
      Lesson lesson =
          question.getLessonId() == null
              ? firstVideoLessonsByCourseId.get(question.getCourseId())
              : lessonsById.get(question.getLessonId());

      if (lesson != null) {
        result.put(question.getId(), lesson);
      }
    }

    return result;
  }

  private Lesson resolveLesson(Question question) {
    if (question == null) {
      return null;
    }

    return resolveLessonsByQuestionId(List.of(question)).get(question.getId());
  }

  private Map<Long, Lesson> resolveFirstVideoLessonsByCourseId(List<Question> questions) {
    List<Long> courseIds =
        questions.stream()
            .filter(question -> question.getLessonId() == null)
            .map(Question::getCourseId)
            .filter(courseId -> courseId != null)
            .distinct()
            .toList();

    if (courseIds.isEmpty()) {
      return Map.of();
    }

    return lessonRepository
        .findPublishedLessonsByCourseIdsAndTypeInDisplayOrder(courseIds, LessonType.VIDEO)
        .stream()
        .collect(
            Collectors.toMap(
                lesson -> lesson.getSection().getCourse().getCourseId(),
                lesson -> lesson,
                (left, right) -> left));
  }

  private String getInstructorDisplayName(Long instructorId) {
    return userRepository.findById(instructorId).map(User::getName).orElse("강사");
  }

  private String getInstructorProfileImage(Long instructorId) {
    return getProfileImage(instructorId);
  }

  private String getProfileImage(Long userId) {
    if (userId == null) {
      return null;
    }
    return userProfileRepository.findByUserId(userId).map(UserProfile::getDisplayProfileImage).orElse(null);
  }

  private Map<Long, String> resolveProfileImages(List<Question> questions) {
    List<Long> userIds =
        questions.stream()
            .map(Question::getUser)
            .filter(user -> user != null)
            .map(User::getId)
            .distinct()
            .toList();
    if (userIds.isEmpty()) {
      return Map.of();
    }
    return userProfileRepository.findAllByUserIdIn(userIds).stream()
        .collect(
            Collectors.toMap(
                profile -> profile.getUser().getId(),
                UserProfile::getDisplayProfileImage,
                (left, right) -> left));
  }

  private Map<Long, QnaStatus> resolveStatuses(List<Question> questions) {
    if (questions.isEmpty()) {
      return Map.of();
    }

    Map<Long, QnaStatus> statuses =
        questions.stream()
            .collect(
                Collectors.toMap(
                    Question::getId, question -> QnaStatus.UNANSWERED, (left, right) -> left));

    answerRepository
        .findAllByQuestionIdInAndIsDeletedFalse(
            questions.stream().map(Question::getId).distinct().toList())
        .forEach(answer -> statuses.put(answer.getQuestion().getId(), QnaStatus.ANSWERED));

    return statuses;
  }
}
