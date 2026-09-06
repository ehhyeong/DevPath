package com.devpath.api.instructor.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.devpath.api.instructor.dto.qna.QnaInboxResponse;
import com.devpath.domain.course.entity.Course;
import com.devpath.domain.course.repository.CourseRepository;
import com.devpath.domain.course.repository.LessonRepository;
import com.devpath.domain.instructor.repository.QnaAnswerDraftRepository;
import com.devpath.domain.qna.entity.Question;
import com.devpath.domain.qna.entity.QuestionDifficulty;
import com.devpath.domain.qna.entity.QuestionTemplateType;
import com.devpath.domain.qna.repository.AnswerRepository;
import com.devpath.domain.qna.repository.QuestionRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.entity.UserRole;
import com.devpath.domain.user.repository.UserProfileRepository;
import com.devpath.domain.user.repository.UserRepository;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class InstructorQnaInboxQueryServiceTest {

  @Mock private QuestionRepository questionRepository;
  @Mock private AnswerRepository answerRepository;
  @Mock private UserRepository userRepository;
  @Mock private UserProfileRepository userProfileRepository;
  @Mock private CourseRepository courseRepository;
  @Mock private LessonRepository lessonRepository;
  @Mock private QnaAnswerDraftRepository draftRepository;
  @Mock private InstructorQnaQuestionAccess questionAccess;

  private InstructorQnaInboxQueryService service;

  @BeforeEach
  void setUp() {
    service =
        new InstructorQnaInboxQueryService(
            questionRepository,
            answerRepository,
            userRepository,
            userProfileRepository,
            courseRepository,
            lessonRepository,
            draftRepository,
            questionAccess);
  }

  @Test
  void getInboxMapsCourseAndUnansweredStatus() {
    User learner =
        User.builder()
            .email("learner@test.com")
            .password("encoded")
            .name("학습자")
            .role(UserRole.ROLE_LEARNER)
            .build();
    ReflectionTestUtils.setField(learner, "id", 3L);
    Question question =
        Question.builder()
            .user(learner)
            .templateType(QuestionTemplateType.STUDY)
            .difficulty(QuestionDifficulty.EASY)
            .title("트랜잭션 질문")
            .content("전파 속성이 궁금합니다.")
            .courseId(11L)
            .build();
    ReflectionTestUtils.setField(question, "id", 31L);
    Course course = mock(Course.class);
    when(course.getCourseId()).thenReturn(11L);
    when(course.getTitle()).thenReturn("Spring 강의");
    when(questionRepository.findAllByInstructorIdAndIsDeletedFalse(7L))
        .thenReturn(List.of(question));
    when(courseRepository.findAllById(List.of(11L))).thenReturn(List.of(course));
    when(lessonRepository.findPublishedLessonsByCourseIdsAndTypeInDisplayOrder(
            org.mockito.ArgumentMatchers.anyList(), org.mockito.ArgumentMatchers.any()))
        .thenReturn(List.of());
    when(answerRepository.findAllByQuestionIdInAndIsDeletedFalse(List.of(31L)))
        .thenReturn(List.of());
    when(userProfileRepository.findAllByUserIdIn(List.of(3L))).thenReturn(List.of());

    List<QnaInboxResponse> result = service.getInbox(7L, null);

    assertThat(result)
        .singleElement()
        .satisfies(
            item -> {
              assertThat(item.questionId()).isEqualTo(31L);
              assertThat(item.courseTitle()).isEqualTo("Spring 강의");
              assertThat(item.status().name()).isEqualTo("UNANSWERED");
            });
  }
}
