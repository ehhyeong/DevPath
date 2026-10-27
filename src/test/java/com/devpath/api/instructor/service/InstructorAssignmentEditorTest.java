package com.devpath.api.instructor.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.devpath.api.instructor.dto.InstructorLessonEvaluationDto.SaveAssignmentEditorRequest;
import com.devpath.common.exception.CustomException;
import com.devpath.domain.course.entity.Lesson;
import com.devpath.domain.learning.entity.Assignment;
import com.devpath.domain.learning.entity.SubmissionType;
import com.devpath.domain.learning.repository.AssignmentRepository;
import com.devpath.domain.roadmap.entity.RoadmapNode;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class InstructorAssignmentEditorTest {
  @Mock private AssignmentRepository repository;
  private InstructorAssignmentEditor editor;
  private final RoadmapNode node = RoadmapNode.builder().nodeId(42L).title("과제 노드").build();
  private final Lesson lesson = Lesson.builder().lessonId(339L).title("실습 과제").build();

  @BeforeEach
  void setUp() {
    editor = new InstructorAssignmentEditor(repository);
  }

  @Test
  void savingFromOlderClientPreservesSeededHtmlFormats() {
    Assignment assignment = assignment("html,md");
    when(repository.findFirstByRoadmapNodeNodeIdAndIsDeletedFalseOrderByCreatedAtDesc(42L))
        .thenReturn(Optional.of(assignment));
    when(repository.save(any(Assignment.class))).thenAnswer(call -> call.getArgument(0));

    editor.save(lesson, node, new SaveAssignmentEditorRequest());

    assertThat(assignment.getAllowedFileFormats()).isEqualTo("html,md");
  }

  @Test
  void savesNormalizedExtensionsAndReturnsThemOnReload() {
    Assignment assignment = assignment("pdf");
    when(repository.findFirstByRoadmapNodeNodeIdAndIsDeletedFalseOrderByCreatedAtDesc(42L))
        .thenReturn(Optional.of(assignment));
    when(repository.save(any(Assignment.class))).thenAnswer(call -> call.getArgument(0));
    SaveAssignmentEditorRequest request = new SaveAssignmentEditorRequest();
    ReflectionTestUtils.setField(
        request, "allowedFileFormats", List.of(".HTML", " pdf ", "MD", "html"));

    editor.save(lesson, node, request);

    assertThat(assignment.getAllowedFileFormats()).isEqualTo("html,pdf,md");
    assertThat(editor.get(lesson, node).getAllowedFileFormats())
        .containsExactly("html", "pdf", "md");
  }

  @Test
  void emptyListExplicitlyRemovesExtensionRestriction() {
    Assignment assignment = assignment("html");
    when(repository.findFirstByRoadmapNodeNodeIdAndIsDeletedFalseOrderByCreatedAtDesc(42L))
        .thenReturn(Optional.of(assignment));
    when(repository.save(any(Assignment.class))).thenAnswer(call -> call.getArgument(0));
    SaveAssignmentEditorRequest request = new SaveAssignmentEditorRequest();
    ReflectionTestUtils.setField(request, "allowedFileFormats", List.of());

    editor.save(lesson, node, request);

    assertThat(assignment.getAllowedFileFormats()).isNull();
    assertThat(editor.get(lesson, node).getAllowedFileFormats()).isEmpty();
  }

  @Test
  void rejectsMimeTypesAndMultiPartExtensionsInsteadOfSavingUnmatchableRules() {
    when(repository.findFirstByRoadmapNodeNodeIdAndIsDeletedFalseOrderByCreatedAtDesc(42L))
        .thenReturn(Optional.empty());
    for (String invalid : List.of("text/html", "tar.gz", "*", "")) {
      SaveAssignmentEditorRequest request = new SaveAssignmentEditorRequest();
      ReflectionTestUtils.setField(request, "allowedFileFormats", List.of(invalid));
      assertThatThrownBy(() -> editor.save(lesson, node, request))
          .isInstanceOf(CustomException.class);
    }
  }

  private Assignment assignment(String formats) {
    return Assignment.builder()
        .roadmapNode(node)
        .title("실습 과제")
        .description("")
        .submissionType(SubmissionType.FILE)
        .allowedFileFormats(formats)
        .build();
  }
}
