package com.devpath.api.evaluation.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.devpath.common.provider.GeminiProvider;
import com.devpath.domain.learning.entity.Assignment;
import com.devpath.domain.learning.entity.Rubric;
import com.devpath.domain.learning.entity.Submission;
import java.util.List;
import org.junit.jupiter.api.Test;

class SubmissionAutoGraderTest {

  @Test
  void usesConservativeFallbackWhenGeminiReturnsNoResponse() {
    GeminiProvider geminiProvider = mock(GeminiProvider.class);
    Submission submission = mock(Submission.class);
    Assignment assignment = mock(Assignment.class);
    Rubric rubric = mock(Rubric.class);
    when(geminiProvider.generate(org.mockito.ArgumentMatchers.anyString())).thenReturn(null);
    when(rubric.getId()).thenReturn(3L);
    when(rubric.getCriteriaName()).thenReturn("정확성");
    when(rubric.getMaxPoints()).thenReturn(20);
    when(submission.getAssignment()).thenReturn(assignment);
    when(assignment.getTitle()).thenReturn("테스트 과제");

    SubmissionAutoGrader.Result result =
        new SubmissionAutoGrader(geminiProvider).grade(submission, List.of(rubric));

    assertThat(result.fallbackUsed()).isTrue();
    assertThat(result.rubricGradeItems()).singleElement().extracting("earnedPoints").isEqualTo(10);
  }
}
