package com.devpath.api.instructor.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.devpath.api.evaluation.service.AiQuizDraftService;
import com.devpath.api.instructor.dto.InstructorLessonEvaluationDto;
import com.devpath.domain.course.entity.Lesson;
import com.devpath.domain.course.repository.CourseNodeMappingRepository;
import com.devpath.domain.course.repository.LessonRepository;
import com.devpath.domain.learning.entity.Assignment;
import com.devpath.domain.learning.entity.Quiz;
import com.devpath.domain.learning.repository.AssignmentRepository;
import com.devpath.domain.learning.repository.QuizRepository;
import com.devpath.domain.roadmap.entity.RoadmapNode;
import com.devpath.domain.roadmap.repository.RoadmapNodeRepository;
import com.devpath.domain.roadmap.repository.RoadmapRepository;
import com.devpath.domain.user.repository.UserRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class InstructorLessonEvaluationServiceTest {

  @Mock private UserRepository userRepository;
  @Mock private LessonRepository lessonRepository;
  @Mock private RoadmapRepository roadmapRepository;
  @Mock private RoadmapNodeRepository roadmapNodeRepository;
  @Mock private CourseNodeMappingRepository courseNodeMappingRepository;
  @Mock private QuizRepository quizRepository;
  @Mock private AssignmentRepository assignmentRepository;
  @Mock private AiQuizDraftService aiQuizDraftService;

  private InstructorLessonEvaluationService evaluationService;

  @BeforeEach
  void setUp() {
    evaluationService =
        new InstructorLessonEvaluationService(
            userRepository,
            lessonRepository,
            roadmapRepository,
            roadmapNodeRepository,
            courseNodeMappingRepository,
            new InstructorQuizEditor(quizRepository, aiQuizDraftService),
            new InstructorAssignmentEditor(assignmentRepository));
  }

  @Test
  void getQuizEditorReturnsNewQuizDefaultsWhenLessonHasNoQuiz() {
    long instructorId = 7L;
    long lessonId = 31L;
    when(userRepository.existsById(instructorId)).thenReturn(true);
    when(lessonRepository.findByLessonIdAndSectionCourseInstructorId(lessonId, instructorId))
        .thenReturn(Optional.of(lesson(lessonId)));

    InstructorLessonEvaluationDto.QuizEditorResponse response =
        evaluationService.getQuizEditor(instructorId, lessonId);

    assertThat(response.getLessonId()).isEqualTo(lessonId);
    assertThat(response.getNodeId()).isNull();
    assertThat(response.getQuizId()).isNull();
    assertThat(response.getTitle()).isEqualTo("트랜잭션 기초");
    assertThat(response.getTotalScore()).isZero();
    assertThat(response.getPassScore()).isEqualTo(60);
    assertThat(response.getQuestions()).isEmpty();
  }

  @Test
  void getAssignmentEditorReturnsNewAssignmentDefaultsWhenLessonHasNoAssignment() {
    long instructorId = 7L;
    long lessonId = 31L;
    when(userRepository.existsById(instructorId)).thenReturn(true);
    when(lessonRepository.findByLessonIdAndSectionCourseInstructorId(lessonId, instructorId))
        .thenReturn(Optional.of(lesson(lessonId)));

    InstructorLessonEvaluationDto.AssignmentEditorResponse response =
        evaluationService.getAssignmentEditor(instructorId, lessonId);

    assertThat(response.getLessonId()).isEqualTo(lessonId);
    assertThat(response.getNodeId()).isNull();
    assertThat(response.getAssignmentId()).isNull();
    assertThat(response.getTitle()).isEqualTo("트랜잭션 기초");
    assertThat(response.getTotalScore()).isEqualTo(100);
    assertThat(response.getPassScore()).isEqualTo(80);
    assertThat(response.getAiReviewEnabled()).isTrue();
    assertThat(response.getRubrics()).isEmpty();
  }

  @Test
  void saveQuizEditorPreservesQuestionAndOptionRules() {
    long instructorId = 7L;
    long lessonId = 31L;
    Lesson lesson = lesson(lessonId);
    RoadmapNode node = RoadmapNode.builder().nodeId(41L).title("퀴즈 노드").build();
    lesson.linkQuizRoadmapNode(node);
    InstructorLessonEvaluationDto.QuizOptionInput correctOption =
        new InstructorLessonEvaluationDto.QuizOptionInput();
    ReflectionTestUtils.setField(correctOption, "optionText", "REQUIRED");
    ReflectionTestUtils.setField(correctOption, "isCorrect", true);
    InstructorLessonEvaluationDto.QuizOptionInput wrongOption =
        new InstructorLessonEvaluationDto.QuizOptionInput();
    ReflectionTestUtils.setField(wrongOption, "optionText", "REQUIRES_NEW");
    ReflectionTestUtils.setField(wrongOption, "isCorrect", false);
    InstructorLessonEvaluationDto.QuizQuestionInput question =
        new InstructorLessonEvaluationDto.QuizQuestionInput();
    ReflectionTestUtils.setField(question, "questionType", "MULTIPLE_CHOICE");
    ReflectionTestUtils.setField(question, "questionText", "기본 전파 속성은 무엇인가요?");
    ReflectionTestUtils.setField(question, "points", 10);
    ReflectionTestUtils.setField(question, "options", List.of(correctOption, wrongOption));
    InstructorLessonEvaluationDto.SaveQuizEditorRequest request =
        new InstructorLessonEvaluationDto.SaveQuizEditorRequest();
    ReflectionTestUtils.setField(request, "title", "트랜잭션 퀴즈");
    ReflectionTestUtils.setField(request, "passScore", 8);
    ReflectionTestUtils.setField(request, "questions", List.of(question));
    when(userRepository.existsById(instructorId)).thenReturn(true);
    when(lessonRepository.findByLessonIdAndSectionCourseInstructorId(lessonId, instructorId))
        .thenReturn(Optional.of(lesson));
    when(quizRepository.findFirstByRoadmapNodeNodeIdAndIsDeletedFalseOrderByCreatedAtDesc(41L))
        .thenReturn(Optional.empty());
    when(quizRepository.save(any(Quiz.class))).thenAnswer(invocation -> invocation.getArgument(0));

    InstructorLessonEvaluationDto.QuizEditorResponse response =
        evaluationService.saveQuizEditor(instructorId, lessonId, request);

    assertThat(response.getTotalScore()).isEqualTo(10);
    assertThat(response.getQuestions()).hasSize(1);
    assertThat(response.getQuestions().getFirst().getOptions()).hasSize(2);
    assertThat(response.getQuestions().getFirst().getOptions().getFirst().getIsCorrect()).isTrue();
  }

  @Test
  void saveAssignmentEditorCalculatesRubricTotalAndSubmissionFlags() {
    long instructorId = 7L;
    long lessonId = 31L;
    Lesson lesson = lesson(lessonId);
    RoadmapNode node = RoadmapNode.builder().nodeId(42L).title("과제 노드").build();
    lesson.linkAssignmentRoadmapNode(node);
    InstructorLessonEvaluationDto.AssignmentRubricInput firstRubric =
        new InstructorLessonEvaluationDto.AssignmentRubricInput();
    ReflectionTestUtils.setField(firstRubric, "criteriaName", "정확성");
    ReflectionTestUtils.setField(firstRubric, "maxPoints", 60);
    InstructorLessonEvaluationDto.AssignmentRubricInput secondRubric =
        new InstructorLessonEvaluationDto.AssignmentRubricInput();
    ReflectionTestUtils.setField(secondRubric, "criteriaName", "테스트");
    ReflectionTestUtils.setField(secondRubric, "maxPoints", 40);
    InstructorLessonEvaluationDto.SaveAssignmentEditorRequest request =
        new InstructorLessonEvaluationDto.SaveAssignmentEditorRequest();
    ReflectionTestUtils.setField(request, "title", "트랜잭션 과제");
    ReflectionTestUtils.setField(request, "passScore", 80);
    ReflectionTestUtils.setField(request, "allowTextSubmission", true);
    ReflectionTestUtils.setField(request, "allowFileSubmission", false);
    ReflectionTestUtils.setField(request, "allowUrlSubmission", true);
    ReflectionTestUtils.setField(request, "rubrics", List.of(firstRubric, secondRubric));
    when(userRepository.existsById(instructorId)).thenReturn(true);
    when(lessonRepository.findByLessonIdAndSectionCourseInstructorId(lessonId, instructorId))
        .thenReturn(Optional.of(lesson));
    when(assignmentRepository.findFirstByRoadmapNodeNodeIdAndIsDeletedFalseOrderByCreatedAtDesc(
            42L))
        .thenReturn(Optional.empty());
    when(assignmentRepository.save(any(Assignment.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));

    InstructorLessonEvaluationDto.AssignmentEditorResponse response =
        evaluationService.saveAssignmentEditor(instructorId, lessonId, request);

    assertThat(response.getTotalScore()).isEqualTo(100);
    assertThat(response.getPassScore()).isEqualTo(80);
    assertThat(response.getAllowTextSubmission()).isTrue();
    assertThat(response.getAllowFileSubmission()).isFalse();
    assertThat(response.getAllowUrlSubmission()).isTrue();
    assertThat(response.getRubrics()).hasSize(2);
  }

  private Lesson lesson(long lessonId) {
    return Lesson.builder()
        .lessonId(lessonId)
        .title("트랜잭션 기초")
        .description("Spring 트랜잭션을 학습합니다.")
        .build();
  }
}
