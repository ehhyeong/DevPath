package com.devpath.api.evaluation.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.devpath.api.evaluation.dto.response.SubmissionGradeResponse;
import com.devpath.api.notification.service.NotificationEventService;
import com.devpath.domain.learning.entity.Assignment;
import com.devpath.domain.learning.entity.Rubric;
import com.devpath.domain.learning.entity.Submission;
import com.devpath.domain.learning.entity.SubmissionFile;
import com.devpath.domain.learning.repository.RubricRepository;
import com.devpath.domain.learning.repository.SubmissionRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class SubmissionRenderingDemoTest {
  @Mock private UserRepository users;
  @Mock private SubmissionRepository submissions;
  @Mock private RubricRepository rubricRepository;
  @Mock private SubmissionAutoGrader grader;
  @Mock private NotificationEventService notifications;
  @InjectMocks private SubmissionGradingService service;
  private List<Rubric> rubrics;

  @BeforeEach
  void setUp() {
    rubrics = List.of(rubric(1, 25), rubric(2, 25), rubric(3, 30), rubric(4, 20));
    when(rubricRepository.findAllByAssignmentIdAndIsDeletedFalseOrderByDisplayOrderAsc(59L))
        .thenReturn(rubrics);
  }

  @Test
  void attachedIndexHtmlGetsDemoFeedbackWithoutGeminiRegardlessOfCourseId() throws Exception {
    var submission = submission("index.html");
    service.autoGradeOnSubmit(submission);
    assertThat(submission.getTotalScore()).isEqualTo(85);
    assertThat(submission.getIndividualFeedback()).contains("23/25점", "22/25점", "26/30점", "14/20점");
    verify(grader, never()).grade(any(), any());
  }

  @Test
  void anotherHtmlFileNameUsesNormalGradingInsteadOfFailingFormatValidation() throws Exception {
    var submission = submission("another.html");
    when(grader.grade(submission, rubrics))
        .thenReturn(
            new SubmissionAutoGrader.Result(
                List.of(SubmissionGradeResponse.RubricGradeItem.builder().earnedPoints(70).build()),
                "일반 채점",
                false));
    service.autoGradeOnSubmit(submission);
    verify(grader).grade(submission, rubrics);
    assertThat(submission.getTotalScore()).isEqualTo(70);
  }

  private Submission submission(String filename) throws Exception {
    var assignment = Assignment.builder().title("HTML/CSS/JavaScript 렌더링 흐름 미니 페이지 만들기").build();
    ReflectionTestUtils.setField(assignment, "id", 59L);
    var learner = org.mockito.Mockito.mock(User.class);
    var submission = Submission.builder().assignment(assignment).learner(learner).build();
    try (var input = getClass().getResourceAsStream("/submissions/index.html")) {
      submission.addFile(
          SubmissionFile.builder()
              .fileName(filename)
              .fileType("html")
              .textContent(new String(input.readAllBytes(), StandardCharsets.UTF_8))
              .build());
    }
    return submission;
  }

  private Rubric rubric(int order, int points) {
    var rubric =
        Rubric.builder().criteriaName("평가 " + order).maxPoints(points).displayOrder(order).build();
    ReflectionTestUtils.setField(rubric, "id", (long) order);
    return rubric;
  }
}
