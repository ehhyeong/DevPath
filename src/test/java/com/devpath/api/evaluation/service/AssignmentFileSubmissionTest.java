package com.devpath.api.evaluation.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.devpath.api.evaluation.dto.request.AssignmentPrecheckRequest;
import com.devpath.api.evaluation.dto.request.CreateSubmissionFileRequest;
import com.devpath.api.evaluation.dto.request.CreateSubmissionRequest;
import com.devpath.common.exception.CustomException;
import com.devpath.domain.course.repository.CourseNodeMappingRepository;
import com.devpath.domain.learning.entity.Assignment;
import com.devpath.domain.learning.entity.Submission;
import com.devpath.domain.learning.entity.SubmissionType;
import com.devpath.domain.learning.repository.AssignmentRepository;
import com.devpath.domain.learning.repository.SubmissionRepository;
import com.devpath.domain.roadmap.entity.RoadmapNode;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.entity.UserRole;
import com.devpath.domain.user.repository.UserRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class AssignmentFileSubmissionTest {
  @Mock private UserRepository users;
  @Mock private AssignmentRepository assignments;
  @Mock private SubmissionRepository submissions;
  @Mock private SubmissionGradingService grading;
  @Mock private CourseNodeMappingRepository mappings;
  @InjectMocks private AssignmentPrecheckService precheck;
  @InjectMocks private AssignmentSubmissionService submissionService;
  private Assignment assignment;

  @BeforeEach
  void setUp() {
    User learner = org.mockito.Mockito.mock(User.class);
    lenient().when(learner.getId()).thenReturn(7L);
    when(learner.getRole()).thenReturn(UserRole.ROLE_LEARNER);
    lenient().when(learner.getIsActive()).thenReturn(true);
    when(users.findById(7L)).thenReturn(Optional.of(learner));
    assignment =
        Assignment.builder()
            .roadmapNode(RoadmapNode.builder().nodeId(1156L).build())
            .title("실습 과제")
            .description("")
            .submissionType(SubmissionType.FILE)
            .allowTextSubmission(false)
            .allowFileSubmission(true)
            .allowUrlSubmission(false)
            .allowedFileFormats("html,pdf,md")
            .isActive(true)
            .isPublished(true)
            .build();
    ReflectionTestUtils.setField(assignment, "id", 59L);
    when(assignments.findByIdAndIsDeletedFalse(59L)).thenReturn(Optional.of(assignment));
  }

  @ParameterizedTest
  @ValueSource(strings = {"index.html", "INDEX.HTML", "다른이름.html", "report.pdf", "README.md"})
  void filenameExtensionIsCheckedConsistentlyBeforeAndDuringSubmission(String fileName) {
    var file = file(fileName, "application/octet-stream");
    assertThat(precheck.precheck(7L, 59L, precheckRequest(file)).getFileFormatPassed()).isTrue();
    when(submissions.save(any(Submission.class))).thenAnswer(call -> call.getArgument(0));
    assertThat(submissionService.createSubmission(7L, 59L, submissionRequest(file)).getFileCount())
        .isEqualTo(1);
    verify(grading).autoGradeOnSubmit(any(Submission.class));
  }

  @Test
  void course127DoesNotBypassRejectedExtension() {
    lenient().when(mappings.findCourseIdsByNodeId(1156L)).thenReturn(List.of(127L));
    var file = file("index.exe", "html");
    var result = precheck.precheck(7L, 59L, precheckRequest(file));
    assertThat(result.getFileFormatPassed()).isFalse();
    assertThat(result.getMessage()).contains(".html", ".pdf", ".md");
    assertThatThrownBy(() -> submissionService.createSubmission(7L, 59L, submissionRequest(file)))
        .isInstanceOf(CustomException.class)
        .hasMessageContaining(".html");
    verifyNoInteractions(submissions, grading);
  }

  private CreateSubmissionFileRequest file(String name, String type) {
    return CreateSubmissionFileRequest.builder()
        .fileName(name)
        .fileType(type)
        .fileSize(6383L)
        .fileUrl("local-upload://" + name)
        .textContent("<!doctype html><html></html>")
        .build();
  }

  private AssignmentPrecheckRequest precheckRequest(CreateSubmissionFileRequest file) {
    return AssignmentPrecheckRequest.builder().files(List.of(file)).build();
  }

  private CreateSubmissionRequest submissionRequest(CreateSubmissionFileRequest file) {
    return CreateSubmissionRequest.builder().files(List.of(file)).build();
  }
}
