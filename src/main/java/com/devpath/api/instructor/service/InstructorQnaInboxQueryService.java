package com.devpath.api.instructor.service;

import com.devpath.api.instructor.dto.qna.QnaAnswerResponse;
import com.devpath.api.instructor.dto.qna.QnaDraftResponse;
import com.devpath.api.instructor.dto.qna.QnaInboxResponse;
import com.devpath.api.instructor.dto.qna.QnaTimelineResponse;
import com.devpath.domain.course.entity.Course;
import com.devpath.domain.course.entity.Lesson;
import com.devpath.domain.course.entity.LessonType;
import com.devpath.domain.course.repository.CourseRepository;
import com.devpath.domain.course.repository.LessonRepository;
import com.devpath.domain.instructor.repository.QnaAnswerDraftRepository;
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
@Transactional(readOnly = true)
public class InstructorQnaInboxQueryService {

  private final QuestionRepository questionRepository;
  private final AnswerRepository answerRepository;
  private final UserRepository userRepository;
  private final UserProfileRepository userProfileRepository;
  private final CourseRepository courseRepository;
  private final LessonRepository lessonRepository;
  private final QnaAnswerDraftRepository draftRepository;
  private final InstructorQnaQuestionAccess questionAccess;

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

  public QnaTimelineResponse getTimeline(Long questionId, Long instructorId) {
    Question question = questionAccess.getManagedQuestion(questionId, instructorId);
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
                        getProfileImage(answer.getUser().getId())))
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

  private Map<Long, String> resolveCourseTitles(List<Question> questions) {
    List<Long> courseIds =
        questions.stream().map(Question::getCourseId).filter(id -> id != null).distinct().toList();
    if (courseIds.isEmpty()) {
      return Map.of();
    }
    return courseRepository.findAllById(courseIds).stream()
        .collect(Collectors.toMap(Course::getCourseId, Course::getTitle, (left, right) -> left));
  }

  private String resolveCourseTitle(Long courseId) {
    return courseId == null
        ? null
        : courseRepository.findById(courseId).map(Course::getTitle).orElse(null);
  }

  private Map<Long, Lesson> resolveLessonsByQuestionId(List<Question> questions) {
    List<Long> lessonIds =
        questions.stream().map(Question::getLessonId).filter(id -> id != null).distinct().toList();
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
    return question == null
        ? null
        : resolveLessonsByQuestionId(List.of(question)).get(question.getId());
  }

  private Map<Long, Lesson> resolveFirstVideoLessonsByCourseId(List<Question> questions) {
    List<Long> courseIds =
        questions.stream()
            .filter(question -> question.getLessonId() == null)
            .map(Question::getCourseId)
            .filter(id -> id != null)
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

  private String getProfileImage(Long userId) {
    if (userId == null) {
      return null;
    }
    return userProfileRepository
        .findByUserId(userId)
        .map(UserProfile::getDisplayProfileImage)
        .orElse(null);
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
    Map<Long, String> profileImagesByUserId = new HashMap<>();
    userProfileRepository.findAllByUserIdIn(userIds).stream()
        .filter(profile -> profile.getUser() != null && profile.getUser().getId() != null)
        .forEach(
            profile ->
                profileImagesByUserId.putIfAbsent(
                    profile.getUser().getId(), profile.getDisplayProfileImage()));
    return profileImagesByUserId;
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
