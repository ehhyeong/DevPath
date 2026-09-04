package com.devpath.api.instructor.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.devpath.api.instructor.dto.InstructorLessonEvaluationDto;
import com.devpath.domain.course.entity.Lesson;
import com.devpath.domain.learning.entity.QuestionType;
import com.devpath.domain.learning.entity.QuizType;
import com.devpath.domain.learning.repository.QuizRepository;
import com.devpath.domain.learning.service.QuizDraftGenerator;
import com.devpath.domain.roadmap.entity.RoadmapNode;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class InstructorQuizDraftGeneratorTest {

  @Mock private QuizRepository quizRepository;
  @Mock private QuizDraftGenerator quizDraftGenerator;

  @Test
  void generateMapsInstructorInputAndDomainDraft() {
    long instructorId = 7L;
    Lesson lesson =
        Lesson.builder().lessonId(31L).title("트랜잭션 기초").description("Spring 트랜잭션을 학습합니다.").build();
    RoadmapNode node = RoadmapNode.builder().nodeId(41L).title("퀴즈 노드").build();
    InstructorLessonEvaluationDto.GenerateQuizRequest request =
        new InstructorLessonEvaluationDto.GenerateQuizRequest();
    ReflectionTestUtils.setField(request, "mode", "topic");
    ReflectionTestUtils.setField(request, "keywords", List.of("Spring", "트랜잭션"));
    ReflectionTestUtils.setField(request, "scriptText", "전파 속성");
    ReflectionTestUtils.setField(request, "questionCount", 12);
    ReflectionTestUtils.setField(request, "difficultyLevel", 0);
    QuizDraftGenerator.Draft draft =
        new QuizDraftGenerator.Draft(
            "AI 퀴즈",
            "생성된 초안",
            QuizType.AI_TOPIC,
            List.of(
                new QuizDraftGenerator.Question(
                    QuestionType.MULTIPLE_CHOICE,
                    "기본 전파 속성은?",
                    "REQUIRED이다.",
                    10,
                    1,
                    null,
                    List.of(
                        new QuizDraftGenerator.Option("REQUIRED", true, 1),
                        new QuizDraftGenerator.Option("REQUIRES_NEW", false, 2)))));
    when(quizRepository.findFirstByRoadmapNodeNodeIdAndIsDeletedFalseOrderByCreatedAtDesc(41L))
        .thenReturn(Optional.empty());
    when(quizDraftGenerator.generate(eq(instructorId), any())).thenReturn(draft);

    InstructorLessonEvaluationDto.QuizEditorResponse response =
        new InstructorQuizDraftGenerator(quizRepository, quizDraftGenerator)
            .generate(instructorId, lesson, node, request);

    ArgumentCaptor<QuizDraftGenerator.Command> commandCaptor =
        ArgumentCaptor.forClass(QuizDraftGenerator.Command.class);
    verify(quizDraftGenerator).generate(eq(instructorId), commandCaptor.capture());
    QuizDraftGenerator.Command command = commandCaptor.getValue();
    assertThat(command.nodeId()).isEqualTo(41L);
    assertThat(command.title()).isEqualTo("트랜잭션 기초");
    assertThat(command.quizType()).isEqualTo(QuizType.AI_TOPIC);
    assertThat(command.sourceText()).contains("키워드: Spring, 트랜잭션", "전파 속성");
    assertThat(command.fallbackOnly()).isFalse();
    assertThat(command.questionCount()).isEqualTo(10);
    assertThat(command.difficultyLevel()).isEqualTo(1);
    assertThat(response.getTitle()).isEqualTo("AI 퀴즈");
    assertThat(response.getTotalScore()).isEqualTo(10);
    assertThat(response.getPassScore()).isEqualTo(60);
    assertThat(response.getQuestions()).hasSize(1);
    assertThat(response.getQuestions().getFirst().getOptions()).hasSize(2);
  }
}
