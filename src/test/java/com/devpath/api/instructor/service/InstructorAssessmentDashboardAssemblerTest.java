package com.devpath.api.instructor.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.devpath.api.instructor.dto.analytics.InstructorAnalyticsDashboardResponse;
import com.devpath.domain.analytics.service.InstructorAnalyticsMetrics;
import com.devpath.domain.learning.entity.Quiz;
import com.devpath.domain.learning.entity.QuizAttempt;
import com.devpath.domain.roadmap.entity.RoadmapNode;
import java.util.List;
import org.junit.jupiter.api.Test;

class InstructorAssessmentDashboardAssemblerTest {

  private final InstructorAssessmentDashboardAssembler assembler =
      new InstructorAssessmentDashboardAssembler(new InstructorAnalyticsMetrics());

  @Test
  void assemblesQuizDifficultyWeakPointAndInsights() {
    RoadmapNode node = mock(RoadmapNode.class);
    Quiz quiz = mock(Quiz.class);
    QuizAttempt attempt = mock(QuizAttempt.class);
    InstructorAnalyticsDashboardResponse.DropOffItem dropOff =
        new InstructorAnalyticsDashboardResponse.DropOffItem(
            41L, "Security lesson", 10, 8, 120.0, 20.0);

    when(node.getNodeId()).thenReturn(51L);
    when(node.getTitle()).thenReturn("Spring Security");
    when(quiz.getId()).thenReturn(61L);
    when(quiz.getTitle()).thenReturn("JWT quiz");
    when(quiz.getRoadmapNode()).thenReturn(node);
    when(quiz.getQuestions()).thenReturn(List.of());
    when(attempt.getQuiz()).thenReturn(quiz);
    when(attempt.getIsPassed()).thenReturn(true);
    when(attempt.getScore()).thenReturn(8);
    when(attempt.getMaxScore()).thenReturn(10);
    when(attempt.getTimeSpentSeconds()).thenReturn(60);

    var sections = assembler.assemble(List.of(attempt), List.of(), List.of(dropOff));

    assertThat(sections.quizStats().summary().totalAttempts()).isEqualTo(1);
    assertThat(sections.quizStats().summary().averageScoreRate()).isEqualTo(80.0);
    assertThat(sections.difficultyItems()).hasSize(1);
    assertThat(sections.difficultyItems().get(0).difficultyScore()).isEqualTo(39.0);
    assertThat(sections.weakPoints().get(0).summary()).contains("과제 점수");
    assertThat(sections.aiInsights()).hasSize(3);
  }
}
